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
  ContextMenuActionParameters,
  ContextMenuResponse,
  ContextMenuType,
  ReactionAction,
  ResponseAction,
  SendableMessage,
  SlashCommandLoadingAction,
} from "./types";
import { handleEmoji, report as _report } from "./utility";
import { v4 } from "uuid";
import { RoutedAction } from "./routedAction";
import type { Router } from "./router";
import {
  ERROR_TRIGGER,
  INTERACTION_PROCESS_MS,
  RUN_ACTION_TRIGGER,
} from "./constants";
import { IAction } from "./IAction";
import { APIMessage } from "discord-api-types/v10";

type GenericResponse = (
  params: ActionParameters | ContextMenuActionParameters
) => ReturnType<ContextMenuResponse<ContextMenuType>>;

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

    actionParameters: ActionParameters | ContextMenuActionParameters;
    action: ContextMenuResponse<ContextMenuType> | RoutedAction;

    constructor(
      params: ContextMenuActionParameters,
      action: ContextMenuResponse<ContextMenuType>
    );

    constructor(
      params: ActionParameters,
      action: RoutedAction,
      invokerId: string | Symbol | undefined
    );

    constructor(
      actionParameters: ActionParameters | ContextMenuActionParameters,
      action: RoutedAction | ContextMenuResponse<ContextMenuType>,
      invokerId?: string | Symbol
    ) {
      this.action = action;
      this.actionParameters = actionParameters;
      if (
        actionParameters.type === "user" ||
        actionParameters.type === "message"
      ) {
        /** Context menu interaction */
        this.router = this.bot.router;
      } else if (
        (actionParameters.type === "command" ||
          actionParameters.type === "text") &&
        action instanceof RoutedAction
      ) {
        /** Regular command */
        this.router = action.router;
        this.actionParameters = <ActionParameters>actionParameters;
        if (action.rawAction === this.bot.router.errorAction) {
          this.id = `GlobalError<-${invokerId}`;
        } else if (action.rawAction === this.router.errorAction) {
          this.id = `@Router(${this.router.trigger}).errorAction<-${invokerId}`;
        } else if (typeof invokerId === "symbol") {
          switch (invokerId) {
            case RUN_ACTION_TRIGGER:
              this.id = `@runAction(${this.actionParameters.trigger})`;
              break;
            default:
              this.id = "@unknownSymbol";
          }
        } else if (invokerId) {
          this.id = `@onError<-${invokerId}`;
        } else this.id = v4();
      } else {
        throw new ActionError(
          "unknown",
          `Unsupported action type: ${actionParameters.type}`
        );
      }

      this.execResponse = this.execResponse.bind(this);
      this.execReaction = this.execReaction.bind(this);
      this.executeAll = this.executeAll.bind(this);
    }

    report(...stuff: string[]) {
      const hasRouter = !!this.router;
      (hasRouter ? this.router! : this.bot).report(
        `[Action(${this.id}${hasRouter ? "" : "@CtxMenu"})] =>`,
        ...stuff
      );
    }

    hasError() {
      return "onError" in this.action && !!this.action.onError;
    }

    private getInvoker() {
      const { type } = this.actionParameters;
      return type === "text" || type === "command"
        ? this.actionParameters.msg
        : (<ContextMenuActionParameters>this.actionParameters).interaction;
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
      if (this.action instanceof RoutedAction && this.hasError()) {
        const routedError = this.action.routeError();
        yield (prevAction = new Action(
          <ActionParameters>{ ...this.actionParameters, ...newParams },
          routedError!,
          prevAction.id
        ));
      }
      while (pointer) {
        if (pointer.errorAction) {
          yield (prevAction = new Action(
            <ActionParameters>{ ...this.actionParameters, ...newParams },
            new RoutedAction(this.router, pointer.errorAction, ERROR_TRIGGER),
            prevAction.id
          ));
        }
        pointer = pointer.parent;
      }
      yield undefined;
    }

    async execResponse(_response?: ResponseAction) {
      const { type } = this.actionParameters;

      if (type === "command" || type === "user" || type === "message") {
        //initiate timeout prevention
        const invoker = this.getInvoker() as Exclude<
          ReturnType<Action["getInvoker"]>,
          Message
        >;
        bot.interactionTimeouts[invoker.id] = setTimeout(async () => {
          try {
            if (!invoker.deferred) {
              //inform user
              await invoker.deferReply();
            }
            if (!invoker.replied) {
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

      const response =
        _response ??
        (this.action instanceof RoutedAction
          ? this.action.response
          : this.action);
      if (!response) return;
      if (!this.getInvoker().channel) {
        throw new ActionError(
          "response",
          "A channel could not be found for this action execution"
        );
      }

      //handle real action
      const result = await this.handleActionReply(response);
      //timeout no longer needed
      this.removeInteractionTimeout();
      return result;
    }

    private removeInteractionTimeout() {
      const { type } = this.actionParameters;
      if (type === "command" || type === "user" || type === "message") {
        const id = this.getInvoker().id;
        if (bot.interactionTimeouts[id]) {
          clearTimeout(bot.interactionTimeouts[id]);
          delete bot.interactionTimeouts[id];
        }
      }
    }

    private async handleActionReply(
      responseAction:
        | SlashCommandLoadingAction
        | ResponseAction
        | ContextMenuResponse<ContextMenuType>
    ) {
      const { type } = this.actionParameters;
      try {
        let reply: SendableMessage | undefined;
        if (typeof responseAction === "string") reply = responseAction;
        else if (typeof responseAction === "function")
          reply = await (<GenericResponse>responseAction)(
            this.actionParameters
          );
        if (type === "command" || type === "user" || type === "message") {
          const invoker = this.getInvoker() as Exclude<
            ReturnType<Action["getInvoker"]>,
            Message
          >;
          if (invoker.replied || invoker.deferred) {
            //if message has been deferred, just update content
            return reply ? await invoker.editReply(await reply) : undefined;
          }
          reply && (await invoker.reply(await reply));
          return await invoker.fetchReply();
        }

        return reply
          ? await this.getInvoker().channel?.send(await reply)
          : undefined;
      } catch (e) {
        throw new ActionError("response", e.message, e);
      }
    }

    async execReaction(_reaction?: ReactionAction) {
      if (
        this.actionParameters.type === "message" ||
        this.actionParameters.type === "user" ||
        !(this.action instanceof RoutedAction)
      ) {
        return this.report("Illegal 'execReaction' execution");
      }
      const reaction = _reaction ?? this.action.reaction;
      if (!reaction) return;
      const { msg } = <ActionParameters>this.actionParameters;
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
          emoji = handleEmoji(
            client,
            await reaction(<ActionParameters>this.actionParameters)
          );
        }
        emoji && (await msg.react(emoji));
      } catch (e) {
        throw new ActionError("reaction", e.message, e);
      }
    }

    async executeAll(_action?: ActionObject) {
      const { type, author } = this.actionParameters;

      if (type === "text" || type === "command") {
        const { trigger, args } = this.actionParameters;
        const response =
          this.action instanceof RoutedAction && this.action.response;
        const reaction =
          this.action instanceof RoutedAction && this.action.reaction;
        this.report(
          `Command triggered, user: ${
            author.tag
          }, trigger: ${trigger}, args: ${args}, response: ${
            response ? typeof response : "no"
          }, reaction: ${reaction ? typeof reaction : "no"}`
        );
      } else if (type === "message" || type === "user") {
        const { name, targetUser, targetMessage } = this.actionParameters;
        this.report(
          `Context menu triggered, user: ${
            author.tag
          }, commandName: ${name}, type: ${type}, target: ${
            type === "user"
              ? targetUser?.tag ?? "<NONAME>"
              : `"${targetMessage?.content ?? "<NOCONTENT>"}" by ${
                  targetMessage?.author.username
                }`
          }`
        );
      } else {
        this.report(`Illegal action type ${type}`);
        return;
      }

      const promiseArray: [
        Promise<Message | APIMessage | undefined> | undefined,
        Promise<void> | undefined
      ] = [undefined, undefined];

      if ("response" in this.action || typeof this.action === "function") {
        promiseArray[0] = this.execResponse() as typeof promiseArray[0];
      }

      if ("reaction" in this.action) {
        promiseArray[1] = this.execReaction() as typeof promiseArray[1];
      }

      let responseMessage: Message | undefined = undefined;
      try {
        const output = await Promise.all(promiseArray);
        const outputMessage: Message | { id: string } | undefined =
          output[0] || undefined;
        if (outputMessage && !(outputMessage instanceof Message)) {
          //if it's not a full message, refetch it
          responseMessage = await this.getInvoker().channel?.messages.fetch(
            outputMessage.id
          );
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

      const { __asyncJobs: asyncJobs } = this.actionParameters;
      if (responseMessage && asyncJobs.length) {
        try {
          await Promise.all(
            asyncJobs.map(({ doAfter }) =>
              doAfter({
                ...(<ActionParameters>this.actionParameters),
                msg: responseMessage!,
              })
            )
          );
        } catch (e) {
          this.report(
            `An error ocurred trying to execute async job. TriggerMsgId: ${
              this.getInvoker().id
            }, ReplyMsgId: ${responseMessage.id}, e => ${e}`
          );
        }
      }
    }
  };
