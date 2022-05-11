import {
  CommandInteraction,
  EmojiResolvable,
  Interaction,
  Message,
} from "discord.js";
import { Bot } from "./bot";
import { ActionError } from "./error";
import { SendableMessage } from "./types";
import {
  ActionObject,
  ActionParameters,
  ReactionAction,
  ResponseAction,
} from "./types";
import { handleEmoji, report as _report } from "./utility";
import { v4 } from "uuid";
import { RoutedAction } from "./routedAction";

/**
 * Creates a new class containing the passed `Bot` value inside of it
 * @param bot `Bot` object
 * @returns `Action` class
 */
export const ActionFactory = (bot: Bot) =>
  class Action {
    bot: Bot = bot;
    id: string;
    constructor(
      public params: ActionParameters,
      public action: RoutedAction,
      invokerId: string | undefined = undefined
    ) {
      this.execResponse = this.execResponse.bind(this);
      this.execReaction = this.execReaction.bind(this);
      this.executeAll = this.executeAll.bind(this);
      if (action === this.bot.router.errorAction) {
        this.id = `GlobalError<-${invokerId}`;
      } else if (invokerId) {
        this.id = `@onError<-${invokerId}`;
      } else this.id = v4();
    }

    report(...stuff: string[]) {
      _report(`[Action(${this.id})] =>`, ...stuff);
    }

    hasError() {
      return !!this.action.onError;
    }

    getError(newParams: Partial<ActionParameters>): Action | undefined {
      if (this.hasError()) {
        const routedError = this.action.routeError();
        return new Action(
          { ...this.params, ...newParams },
          routedError!,
          this.id
        );
      }
      return undefined;
    }

    async execResponse(_response?: ResponseAction) {
      const response = _response ?? this.action.response;
      if (!response) return;
      const { msg } = this.params;
      if (!msg.channel) {
        throw new ActionError(
          "response",
          "A channel could not be found for this command execution"
        );
      }

      try {
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
      } catch (e) {
        throw new ActionError("response", e.message, e);
      }
    }

    async execReaction(_reaction?: ReactionAction) {
      const reaction = _reaction ?? this.action.reaction;
      if (!reaction) return;
      const { msg } = this.params;
      const { client } = this.bot;
      if (msg instanceof Interaction) {
        throw new ActionError(
          "reaction",
          "React action as reactions are not supported for slash commands"
        );
      }
      try {
        let emoji: EmojiResolvable | undefined;
        if (typeof reaction === "string") {
          emoji = handleEmoji(client, reaction);
        } else if (typeof reaction === "function") {
          emoji = handleEmoji(client, await reaction(this.params));
        }
        emoji && (await msg.react(emoji));
      } catch (e) {
        throw new ActionError("reaction", e.message, e);
      }
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

      this.report(
        `Command triggered, user: ${
          author.tag
        }, trigger: ${trigger}, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
      );

      const promiseArray: [
        ReturnType<typeof this["execResponse"]> | undefined,
        ReturnType<typeof this["execReaction"]> | undefined
      ] = [undefined, undefined];

      if (response) {
        promiseArray[0] = this.execResponse() as typeof promiseArray[0];
      }

      if (reaction) {
        promiseArray[1] = this.execReaction() as typeof promiseArray[1];
      }

      let responseMessage: Message | undefined = undefined;
      try {
        const output = await Promise.all(promiseArray);
        responseMessage = output[0] || undefined;
      } catch (e) {
        this.report("Exception raised =>", e);
        if (onError) {
          await this.bot.handleAction(
            {
              ...this.params,
              args: e.message,
            },
            new RoutedAction(this.action.router, onError),
            this.id
          );
        } else if (e instanceof ActionError) {
          throw e;
        } else {
          throw new ActionError("unknown", "An unhandled error ocurred!", e);
        }
      }

      if (responseMessage && asyncJobs.length) {
        try {
          await Promise.all(
            asyncJobs.map(({ doAfter }) =>
              doAfter({
                ...this.params,
                msg: responseMessage!,
              })
            )
          );
        } catch (e) {
          this.report(
            `An error ocurred trying to execute async job. TriggerMsgId: ${msg.id}, ReplyMsgId: ${responseMessage.id}, e => ${e}`
          );
        }
      }
    }
  };
