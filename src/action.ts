import {
  CommandInteraction,
  EmojiResolvable,
  Interaction,
  Message,
} from "discord.js";
import { Bot } from "./bot";
import { SendableMessage } from "./types";
import {
  ActionObject,
  ActionParameters,
  MessageError,
  ReactionAction,
  ResponseAction,
} from "./types";
import { handleEmoji, report } from "./utility";

/**
 * Creates a new class containing the passed `Bot` value inside of it
 * @param bot `Bot` object
 * @returns `Action` class
 */
export const ActionFactory = (bot: Bot) =>
  class Action {
    bot: Bot = bot;
    constructor(public params: ActionParameters, public action: ActionObject) {
      this.execResponse = this.execResponse.bind(this);
      this.execReaction = this.execReaction.bind(this);
      this.executeAll = this.executeAll.bind(this);
    }

    async execResponse(_response?: ResponseAction) {
      const response = _response ?? this.action.response;
      if (!response) return;
      const { msg } = this.params;
      if (!msg.channel) {
        throw new Error(
          "A channel could not be found for this command execution"
        );
      }

      let reply: SendableMessage | undefined;
      if (typeof response === "string") reply = response;
      else if (typeof response === "function")
        reply = await response(this.params);
      if (msg instanceof CommandInteraction) {
        if (msg.replied) {
          return !!reply && msg.editReply(await reply);
        }
        reply && (await msg.reply(await reply));
        return msg.fetchReply();
      }
      return !!reply && (await msg.channel.send(await reply));
    }

    async execReaction(_reaction?: ReactionAction) {
      const reaction = _reaction ?? this.action.reaction;
      if (!reaction) return;
      const { msg } = this.params;
      const { client } = this.bot;
      if (msg instanceof Interaction) {
        report(
          `[ExecuteAction] => Ignoring react action as reactions are not supported for slash commands`
        );
        return;
      }
      let emoji: EmojiResolvable | undefined;
      if (typeof reaction === "string") {
        emoji = handleEmoji(client, reaction);
      } else if (typeof reaction === "function") {
        emoji = handleEmoji(client, await reaction(this.params));
      }
      emoji && (await msg.react(emoji));
    }

    async executeAll(_action?: ActionObject) {
      const { reaction, response, onError } = _action ?? this.action;
      const {
        msg,
        args,
        trigger,
        author,
        __asyncJobs: asyncJobs,
      } = this.params;

      let error: MessageError | undefined = undefined;
      report(
        `Command triggered, user: ${
          author.tag
        }, trigger: ${trigger}, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
      );

      if (response) {
        try {
          const responseMsg = await this.execResponse();
          if (responseMsg) {
            try {
              const newParams = { ...this.params, msg: responseMsg as Message };
              for (const asyncJob of asyncJobs) {
                await asyncJob.doAfter(newParams);
              }
            } catch (e) {
              report(
                `An error ocurred trying to execute async job. TriggerMsgId: ${msg.id}, ReplyMsgId: ${responseMsg.id}, e => ${e}`
              );
            }
          }
        } catch (e) {
          if (onError?.response) {
            this.params.error = e;
            await this.execResponse(onError.response);
          }
          console.trace(
            `An unhandled error ocurred while triggering an action response, trigger: ${trigger}\n`,
            e
          );
          error = {
            type: "response",
            error: e,
          };
        }
      }

      if (reaction) {
        try {
          await this.execReaction();
        } catch (e) {
          if (onError?.reaction) {
            this.params.error = e;
            await this.execReaction(onError.reaction);
          }
          console.trace(
            `An unhandled error ocurred while triggering an action reaction, trigger: ${trigger}\n`,
            e
          );
          error = {
            type: "reaction",
            error: e,
          };
        }
      }

      if (error) {
        throw error;
      }
    }
  };
