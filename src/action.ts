import {
  DiscordAPIError,
  EmojiResolvable,
  Interaction,
  Message,
} from "discord.js";
import type { Bot } from "./bot";
import { ActionError } from "./error";
import type {
  ActionObject,
  ActionParameters,
  ReactionAction,
  ResponseAction,
  SendableMessage,
  SlashCommandLoadingAction,
} from "./types";
import { handleEmoji, report as _report } from "./utility";
import { v4 } from "uuid";
import { errorTrigger, RoutedAction } from "./routedAction";
import type { Router } from "./router";
import { INTERACTION_PROCESS_MS } from "./constants";
import { IAction } from "./IAction";

/**
 * Creates a new class containing the passed `Bot` value inside of it
 * @param bot `Bot` object
 * @returns `Action` class
 */
export const ActionFactory = (
  bot: Bot
): new (...k: ConstructorParameters<typeof IAction>) => IAction =>
  class Action implements IAction {
    bot: Bot = bot;
    id: string;
    router: Router;
    constructor(
      public params: ActionParameters,
      public action: RoutedAction,
      invokerId: string | undefined = undefined
    ) {
      this.router = this.action.router;
      this.execResponse = this.execResponse.bind(this);
      this.execReaction = this.execReaction.bind(this);
      this.executeAll = this.executeAll.bind(this);
      if (action.rawAction === this.bot.router.errorAction) {
        this.id = `GlobalError<-${invokerId}`;
      } else if (action.rawAction === this.router.errorAction) {
        this.id = `@Router(${this.router.trigger}).errorAction<-${invokerId}`;
      } else if (invokerId) {
        this.id = `@onError<-${invokerId}`;
      } else this.id = v4();
    }

    report(...stuff: string[]) {
      this.router.report(`[Action(${this.id})] =>`, ...stuff);
    }

    hasError() {
      return !!this.action.onError;
    }

    /**
     * Tries to get the error:
     * - First tries to get the error from the ActionObject
     * - Check router for an `onError` ActionObject
     * - Checks the parent routers
     * @param newParams
     */
    *getError(newParams: Partial<ActionParameters>) {
      let pointer: Router | undefined = this.router;
      let prevAction: Action = this;
      if (this.hasError()) {
        const routedError = this.action.routeError();
        yield (prevAction = new Action(
          <ActionParameters>{ ...this.params, ...newParams },
          routedError!,
          prevAction.id
        ));
      }
      while (pointer) {
        if (pointer.errorAction) {
          yield (prevAction = new Action(
            <ActionParameters>{ ...this.params, ...newParams },
            new RoutedAction(this.router, pointer.errorAction, errorTrigger),
            prevAction.id
          ));
        }
        pointer = pointer.parent;
      }
      yield undefined;
    }

    async execResponse(_response?: ResponseAction) {
      const { msg, type } = this.params;

      if (type === "command") {
        //initiate timeout prevention
        bot.interactionTimeouts[msg.id] = setTimeout(async () => {
          try {
            if (!msg.deferred) {
              //inform user
              await msg.deferReply();
            }
            if (!msg.replied) {
              //if there's a loading action, display it
              const loadingAction = this.router.findLoading();
              if (loadingAction) {
                await this.handleActionReply(loadingAction);
              }
            }
          } catch (e) {
            if (
              (e instanceof DiscordAPIError &&
                !e.message.includes(
                  "Interaction has already been acknowledged"
                )) ||
              !(e instanceof DiscordAPIError)
            ) {
              //Race condition between actual message and this
              //Since we dont want to refetch the interaction/reply as that would be slow,
              //we always try to defer the reply, and ignore any exceptions if it already has been deferred
              this.report(
                `An error ocurred while executing timeout prevention`,
                e
              );
            }
          }

          //timeout prevented, remove from record
          this.removeInteractionTimeout();
        }, INTERACTION_PROCESS_MS);
      }

      const response = _response ?? this.action.response;
      if (!response) return;
      if (!msg.channel) {
        throw new ActionError(
          "response",
          "A channel could not be found for this command execution"
        );
      }

      //handle real action
      const result = await this.handleActionReply(response);
      //timeout no longer needed
      this.removeInteractionTimeout();
      return result;
    }

    private removeInteractionTimeout() {
      const {
        msg: { id },
      } = this.params;
      if (bot.interactionTimeouts[id]) {
        clearTimeout(bot.interactionTimeouts[id]);
        delete bot.interactionTimeouts[id];
      }
    }

    private async handleActionReply(
      responseAction: SlashCommandLoadingAction | ResponseAction
    ) {
      const { msg, type } = this.params;
      try {
        let reply: SendableMessage | undefined;
        if (typeof responseAction === "string") reply = responseAction;
        else if (typeof responseAction === "function")
          reply = await responseAction(this.params);
        if (type === "command") {
          if (msg.replied || msg.deferred) {
            //if message has been deferred, just update content
            return reply ? msg.editReply(await reply) : undefined;
          }
          reply && (await msg.reply(await reply));
          return msg.fetchReply();
        }
        return reply ? await msg.channel.send(await reply) : undefined;
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
      const { reaction, response } = _action ?? this.action;
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
        }, trigger: ${trigger}, args: ${args}, response: ${
          response ? typeof response : "no"
        }, reaction: ${reaction ? typeof reaction : "no"}`
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
        const outputMessage: Message | { id: string } | undefined =
          output[0] || undefined;
        if (outputMessage && !(outputMessage instanceof Message)) {
          //if it's not a full message, refetch it
          responseMessage = await msg.channel?.messages.fetch(outputMessage.id);
        } else {
          responseMessage = outputMessage || undefined;
        }
      } catch (e) {
        this.report("Exception raised =>", e);
        if (e instanceof ActionError) {
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
