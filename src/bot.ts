import {
  ClientOptions,
  CommandInteraction,
  Interaction,
  Message,
} from "discord.js";
import { ActionFactory } from "./action";
import { BotBase } from "./base";
import { Embed } from "./embed";
import {
  ActionParameters,
  BarebonesActionParameters,
  ParametersMiddleWare,
} from "./types";
import { report as _report } from "./utility";
import { ComponentHandler } from "./componentHandler";
import { Router } from "./router";
import { RoutedAction } from "./routedAction";
import { ApplicationCommands } from "./applicationCommands";
import { InteractionHandler } from "./interactionHandler";
import { IAction } from "./IAction";
import { ActionError } from "./error";
import { ERROR_TRIGGER, RUN_ACTION_TRIGGER, TYPO_TRIGGER } from "./constants";

interface BotOptions {
  prefix?: string;
  suffix?: string;
  ignoreCaps?: boolean;
  embed?: Embed;

  /**Custom intents array https://discord.js.org/#/docs/main/stable/class/Intents */
  intents?: ClientOptions["intents"];
}

/**
 * The Bot object, pass in a Discord API token and set the options according to your needs.
 * Note that you're required to set either a prefix and/or a suffix
 */

export class Bot extends BotBase {
  /**The embed object used for creating embeds in your actions */
  readonly embed: Embed;

  /**The prefix used by your bot */
  readonly prefix: string | undefined;

  /**The suffix used by your bot */
  readonly suffix: string | undefined;

  /**The bot will automatically ignore caps on the trigger keyword if enabled */
  readonly ignoreCaps: boolean;

  private middlewareArray: ParametersMiddleWare[] = [];

  private componentHandler: ComponentHandler;

  /** @internal */
  readonly interactionHandler: InteractionHandler;

  /** @internal */
  Action: ReturnType<typeof ActionFactory>;

  /**
   * @internal
   * Stores a dictionary of all the current timeout prevention actions
   * using the *interaction* id as key
   * These actions will remove themselves on timeout
   */
  interactionTimeouts: Record<string, NodeJS.Timeout> = {};

  /**@private */
  router: Router;

  readonly commands = new ApplicationCommands(this);

  constructor(token: string, options: BotOptions) {
    super(token, options.intents);
    this.prefix = options.ignoreCaps
      ? options.prefix?.toLowerCase()
      : options.prefix;
    this.suffix = options.ignoreCaps
      ? options.suffix?.toLowerCase()
      : options.suffix;
    this.embed = options.embed ?? new Embed({});
    this.ignoreCaps = options.ignoreCaps ?? false;
    if (!this.suffix && !this.prefix)
      throw new Error(
        "You need to provide at least one of the following: prefix or suffix"
      );

    /** Component creation */
    this.router = new Router();
    this.router.options.ignoreCaps = this.ignoreCaps;
    this.router._bot = this;
    this.componentHandler = new ComponentHandler();
    this.interactionHandler = new InteractionHandler(
      this,
      this.componentHandler
    );

    /** External binds */
    this.on = this.router.on;
    this.onDefault = this.router.onDefault;
    this.onError = this.router.onError;
    this.onTypo = this.router.onTypo;
    this.onLoading = this.router.onLoading;
    this.compileCommands = this.router.compileAll;
    this.onContextMenu = this.interactionHandler.onContextMenu;
    /** @deprecated */
    this.registerAction = this.on;
    this.setDefaultAction = this.onDefault;
    this.setErrorAction = this.onError;
    /** end @deprecated */

    /** Local binds */
    this.messageHandler = this.messageHandler.bind(this);
    this.handleAction = this.handleAction.bind(this);
    this.Action = ActionFactory(this);

    /** Event handlers */
    this.client.on("messageCreate", this.messageHandler);
    this.client.on(
      "interactionCreate",
      this.interactionHandler.handleInteraction
    );
  }

  /**
   * Creates a new action that the bot will react to.
   * Replaces the now deprecated `registerAction`
   * @param trigger Name of the trigger
   * @param action Action to perform on this command
   * @param parameters [Optional] Parameters to be registered for slash command, defaults to [{name: "arguments", type: "STRING"}]
   * @returns
   */
  on: Router["on"];
  onDefault: Router["onDefault"];
  onError: Router["onError"];
  onContextMenu: InteractionHandler["onContextMenu"];

  /**
   * @param action Callback function to be called if similar commands are found
   */
  onTypo: Router["onTypo"];

  /**
   * @param action What to display if an action is taking longer than 2.5 to be displayed
   * Make sure to keep the execution time of this callback to a minimum
   */
  onLoading: Router["onLoading"];

  /**@deprecated */
  setDefaultAction: Router["onDefault"];

  /**@deprecated */
  setErrorAction: Router["onError"];

  /**@deprecated */
  registerAction: Router["on"];

  compileCommands: Router["compileAll"];

  useMiddleware(middleware: ParametersMiddleWare) {
    return !!this.middlewareArray.push(middleware);
  }

  async createBarebonesParams(
    msgOrInteraction: Message | Interaction
  ): Promise<BarebonesActionParameters> {
    const invalidMsg = () =>
      Error(
        `Unsupported type of msg/interaction: "${msgOrInteraction["constructor"].name}"`
      );

    let paramsType: BarebonesActionParameters["type"];
    if (msgOrInteraction instanceof Message) {
      paramsType = "text";
    } else if (msgOrInteraction instanceof Interaction) {
      if (msgOrInteraction.isUserContextMenu()) {
        paramsType = "user";
      } else if (msgOrInteraction.isMessageContextMenu()) {
        paramsType = "message";
      } else if (msgOrInteraction.isCommand()) {
        paramsType = "command";
      } else {
        throw invalidMsg();
      }
    } else {
      throw invalidMsg();
    }

    let params: BarebonesActionParameters = {
      type: paramsType,
      author:
        msgOrInteraction instanceof Interaction
          ? msgOrInteraction.user
          : msgOrInteraction.author,
      createEmbed: this.embed.create,
      channel: msgOrInteraction.channel ?? undefined,
      guild: msgOrInteraction.guild ?? undefined,
      __asyncJobs: [],
      asyncEffect(doAfter) {
        this.__asyncJobs.push({ doAfter });
      },
      middleware: {},
      bot: this,
    };

    params.asyncEffect = params.asyncEffect.bind(params);

    for (const middleware of this.middlewareArray) {
      params = await middleware(params, msgOrInteraction);
    }

    return <BarebonesActionParameters>params;
  }

  async createParams(
    msg: Message | CommandInteraction,
    args: string | undefined,
    parameters: ActionParameters["parameters"],
    trigger: string,
    router: Router
  ): Promise<ActionParameters> {
    const author = "user" in msg ? msg.user : msg.author;
    const expectReply: ActionParameters["expectReply"] = async (
      response,
      remove
    ) => {
      if (!response) return;
      if (!msg.channel) {
        this.report(
          "[CreateParams] => A channel for this command call could not be located."
        );
        return;
      }
      try {
        const reply = await msg.reply(await response);
        return (
          await msg.channel
            .awaitMessages({
              filter: (message) => message.author.id === author.id,
              max: 1,
              time: 15000,
              errors: ["time"],
            })
            .finally(() => {
              reply && remove && reply.delete();
            })
        ).first();
      } catch (e) {
        this.report(
          `An error ocurred while expecting a reply from ${author.tag}`,
          e
        );
        return;
      }
    };

    const dm: ActionParameters["dm"] = async (message) => {
      const channel = await author.createDM();
      return message !== undefined
        ? await channel.send(await message)
        : message;
    };

    const subscribe: ActionParameters["subscribe"] = (
      componentOptions,
      action,
      idle,
      expectAdditionalIds
    ) => {
      console.log("subbed");
      const [customIds, actionRow] = ComponentHandler.getActionRow(
        componentOptions,
        author
      );
      this.componentHandler.addSubscription(
        customIds,
        msg,
        action,
        idle,
        expectAdditionalIds
      );
      return actionRow;
    };

    const runAction: ActionParameters["runAction"] = (action, params) => {
      this.handleAction(
        params,
        new RoutedAction(router, Router.padAction(action), RUN_ACTION_TRIGGER),
        RUN_ACTION_TRIGGER
      );
    };

    return <ActionParameters>{
      ...(await this.createBarebonesParams(msg)),
      trigger,
      msg,
      args,
      parameters,
      expectReply,
      dm,
      subscribe,
      runAction,
    };
  }

  private async messageHandler(msg: Message) {
    const { content: rawContent } = msg;
    if (!this.prefix && !this.suffix) throw new Error("NO PREFIX OR SUFFIX");
    if (msg.author === this.client.user) return;

    const hasPrefix =
      this.prefix !== undefined &&
      (this.ignoreCaps
        ? rawContent.slice(0, this.prefix.length).toLowerCase() === this.prefix
        : rawContent.slice(0, this.prefix.length) === this.prefix);
    const hasSuffix =
      this.suffix !== undefined &&
      (this.ignoreCaps
        ? rawContent.slice(-1 * this.suffix.length).toLowerCase() ===
          this.suffix
        : rawContent.slice(-1 * this.suffix.length) === this.suffix);

    if (!hasPrefix && !hasSuffix) {
      return;
    }

    const content = rawContent
      .slice(hasPrefix ? this.prefix!.length : 0)
      .slice(0, hasSuffix ? -1 * this.suffix!.length || 0 : undefined)
      .trim(); //remove suffix and prefix

    const action = this.router.findAction(content);

    if (!action) return;

    const routedTriggerArray = action.router.fullTrigger();

    switch (typeof action.trigger) {
      case "string":
        routedTriggerArray.push(action.trigger);
        break;
      case "symbol":
        switch (action.trigger) {
          case ERROR_TRIGGER:
            routedTriggerArray.push("<!onError>");
            break;
          case TYPO_TRIGGER:
            routedTriggerArray.push("<!onTypo>");
            break;
        }
        break;
    }

    let routedTrigger = routedTriggerArray.join(" ").trim();

    if (this.ignoreCaps) {
      routedTrigger = routedTrigger.toLowerCase();
    }

    //args defaults to undefined if no actual arg is provided. AKA empty string
    const args = content.slice(routedTrigger.length).trim() || undefined;

    const params = await this.createParams(
      msg,
      args,
      { arguments: args },
      routedTrigger,
      action.router
    );

    return await this.handleAction(params, action);
  }

  handleAction(action: IAction): Promise<void>;
  handleAction(
    params: ActionParameters,
    routedAction: RoutedAction,
    invokerId?: string | Symbol
  ): Promise<void>;
  async handleAction(
    paramsOrAction: ActionParameters | IAction,
    routedAction?: RoutedAction,
    invokerId?: string
  ) {
    let action: IAction;
    if (paramsOrAction instanceof this.Action) {
      action = paramsOrAction;
    } else if (routedAction instanceof RoutedAction) {
      action = new this.Action(paramsOrAction, routedAction, invokerId);
    } else {
      throw new Error(
        `Illegal action, routedAction required, received ${routedAction}`
      );
    }
    try {
      await action.executeAll();
    } catch (e) {
      for (const errorAction of action.getError({
        args: e.message,
        error: e instanceof ActionError ? e.e : e,
      })) {
        if (!errorAction) break;
        try {
          await errorAction.executeAll();
          break;
        } catch (e) {
          this.report(
            `[handleAction Action(${
              errorAction.id
            })] => An error ocurred processing the fallback action. ${
              e.message ? `Message(${e.message}).` : ""
            } e =>`,
            e.e
          );
        }
      }
    }
  }
}
