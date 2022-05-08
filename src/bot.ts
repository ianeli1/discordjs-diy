import {
  ActivityOptions,
  ClientOptions,
  CommandInteraction,
  Interaction,
  Message,
} from "discord.js";
import { executeAction } from "./action";
import { BotBase } from "./base";
import { Embed } from "./embed";
import { CommandsHandler } from "./handler";
import {
  ActionObject,
  ActionParameters,
  MessageError,
  ResponseAction,
  ParametersMiddleWare,
} from "./types";
import { pick, report } from "./utility";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { ComponentHandler } from "./componentHandler";

interface BotOptions {
  prefix?: string;
  suffix?: string;
  ignoreCaps?: boolean;
  embed?: Embed;

  /**Custom intents array https://discord.js.org/#/docs/main/stable/class/Intents */
  intents?: ClientOptions["intents"];
}

/**
 * The action your bot will be executing on every trigger
 * It can be:
 *  - A function
 *  - A function that returns a Promise
 *  - A function that returns an embed
 *  - A promise
 *  - A string
 *  - Standard Discordjs Message object
 *  - An embed
 *
 * Returning undefined for slash commands will result in an error
 * Note that it can be undefined or a function that returns undefined, but this will simply be ignored
 */
export type BotAction = ActionObject | ResponseAction;

/**
 * The Bot object, pass in a Discord API token and set the options according to your needs.
 * Note that you're required to set either a prefix and/or a suffix
 */

type PresenceType = Required<ActivityOptions["type"]>;

export class Bot extends BotBase {
  private handler: CommandsHandler;
  private errorAction: ActionObject;

  /**The embed object used for creating embeds in your actions */
  readonly embed: Embed;
  private presenceInterval: NodeJS.Timeout;

  /**The prefix used by your bot */
  readonly prefix: string | undefined;

  /**The suffix used by your bot */
  readonly suffix: string | undefined;

  /**The bot will automatically ignore caps on the trigger keyword if enabled */
  readonly ignoreCaps: boolean;

  private middlewareArray: ParametersMiddleWare<any>[] = [];

  private componentHandler: ComponentHandler;

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
    this.handler = new CommandsHandler();
    this.componentHandler = new ComponentHandler();
    this.messageHandler = this.messageHandler.bind(this);
    this.interactionHandler = this.interactionHandler.bind(this);
    this.actionHandler = this.actionHandler.bind(this);
    this.client.on("messageCreate", this.messageHandler);
    this.client.on("interactionCreate", this.interactionHandler);
  }

  async registerSlashCommands(
    /**Guild IDs to use for slash commands */ guilds?: string[]
  ) {
    const rest = new REST({ version: "9" }).setToken(this.token);
    report(JSON.stringify(this.handler.commands, null, 2));

    try {
      if (!this.client.application?.id) throw "Aplication ID missing!";
      if (guilds) {
        for (const guild of guilds) {
          await rest.put(
            //@ts-ignore
            Routes.applicationGuildCommands(this.client.application.id, guild),
            {
              body: this.handler.commands,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }
      } else {
        //@ts-ignore
        await rest.put(Routes.applicationCommands(this.client.application.id), {
          body: this.handler.commands,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      const commands = this.handler.commands.map((x) => x.name);

      report(`[registerSlashCommands] => ${commands} registered`);
      return commands;
    } catch (e) {
      report("[registerSlashCommands] => Encountered an error! >", e);
    }
    return false;
  }

  useMiddleware<T>(middleware: ParametersMiddleWare<T>) {
    return !!this.middlewareArray.push(middleware);
  }

  private turnArrayToRegex(trigger: string[]): RegExp {
    return new RegExp(
      `(${trigger.join("|")})`,
      this.ignoreCaps ? "i" : undefined
    );
  }

  private padAction(
    action: BotAction,
    parameters?: ActionObject["parameters"]
  ): ActionObject {
    if (
      typeof action === "object" &&
      ("response" in action || "reaction" in action)
    ) {
      return parameters ? { ...action, parameters } : action;
    } else
      return {
        response: action as ResponseAction,
        parameters,
      };
  }
  setDefaultAction(action: BotAction) {
    return this.handler.setDefaultAction(this.padAction(action));
  }

  setErrorAction(action: BotAction) {
    this.errorAction = this.padAction(action);
  }

  /**
   *
   * @param trigger Name of the trigger
   * @param action Action to perform on this command
   * @param parameters [Optional] Parameters to be registered for slash command, defaults to [{name: "arguments", type: "STRING"}]
   * @returns
   */
  registerAction(
    trigger: string | string[] | RegExp,
    action: BotAction,
    parameters: ActionObject["parameters"] = []
  ) {
    trigger =
      this.ignoreCaps && typeof trigger === "string"
        ? trigger.toLowerCase()
        : trigger;
    report(`Created a new action, trigger: ${trigger}`);
    return this.handler.setAction(
      trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger,
      this.padAction(action, parameters)
    );
  }

  removeAction(trigger: string | RegExp | string[]) {
    report(`Removed an action, trigger: ${trigger}`);
    return this.handler.removeAction(
      trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger
    );
  }

  async createParams(
    msg: Message | CommandInteraction,
    args: string | undefined,
    parameters: ActionParameters["parameters"],
    trigger: string
  ): Promise<ActionParameters> {
    const author = "user" in msg ? msg.user : msg.author;
    const expectReply: ActionParameters["expectReply"] = async (
      response,
      remove
    ) => {
      if (!response) return;
      if (!msg.channel) {
        report(
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
        report(
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

    const asyncEffect: ActionParameters["asyncEffect"] = (doAfter) => {
      moddedParams.__asyncJobs.push({
        doAfter,
      });
    };

    const vanillaParams: ActionParameters = {
      createEmbed: this.embed.create,
      trigger,
      msg,
      args,
      parameters,
      author,
      channel: msg.channel ?? undefined,
      guild: msg.guild ?? undefined,
      expectReply,
      dm,
      subscribe,
      middleware: undefined,
      asyncEffect,
      __asyncJobs: [],
    };

    let moddedParams: ActionParameters = vanillaParams;

    for (const middleware of this.middlewareArray) {
      moddedParams = await middleware(moddedParams);
    }

    return moddedParams;
  }

  private async interactionHandler(interaction: Interaction) {
    if (interaction.isButton() || interaction.isSelectMenu()) {
      interaction.deferUpdate();
      const subscription = this.componentHandler.getSubscription(
        interaction.customId
      );
      if (!subscription) {
        return;
      }
      if (
        interaction.member &&
        (subscription.additionalUserIds.length === 0
          ? subscription.msg.member?.user.id !== interaction.member?.user.id
          : !subscription.additionalUserIds.includes(
              interaction.member?.user.id
            ))
      ) {
        return;
      }
      const interactionActionParameters = await this.createParams(
        interaction.message as Message,
        undefined,
        {},
        interaction.customId
      );
      let msgReply = await subscription.action(
        interactionActionParameters,
        interaction,
        interaction.isButton()
          ? +(interaction.customId.split("-").pop() ?? 0)
          : interaction.values[0]
      );

      msgReply &&
        (subscription.msg instanceof Message
          ? await (interaction.message as Message).edit(msgReply)
          : await subscription.msg.editReply(msgReply));
      this.componentHandler.renewSubscription(interaction.customId, undefined);
    }

    if (!interaction.isCommand()) {
      return;
    }

    const action = this.handler.findAction(interaction.commandName);

    const params: ActionParameters["parameters"] = {};

    try {
      if (action.parameters) {
        for (const param of action.parameters) {
          switch (param.type ?? "STRING") {
            case "USER":
              const user = interaction.options.getUser(param.name);
              user && (params[param.name] = user);
              break;
            case "ROLE":
              const role = interaction.options.getRole(param.name);
              role && (params[param.name] = role);
              break;
            case "MENTIONABLE":
              const mentionable = interaction.options.getMentionable(
                param.name
              );
              //@ts-ignore todo idk
              mentionable && (params[param.name] = mentionable);
              break;

            default:
              const val = interaction.options.get(param.name)?.value;
              val && (params[param.name] = val);
          }
        }
      } else {
        params["arguments"] = interaction.options.getString("arguments", true);
      }

      const actionParameters = await this.createParams(
        interaction,
        params.arguments as string | undefined,
        params,
        interaction.commandName
      );

      return await this.actionHandler(actionParameters, action);
    } catch (e) {}
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

    let trigger = content.split(" ")[0]; //get first word

    if (this.ignoreCaps) trigger = trigger.toLowerCase();

    const args = content.slice(trigger.length).trim();

    const params = await this.createParams(
      msg,
      args,
      { arguments: args },
      trigger
    );

    const action = this.handler.findAction(trigger);

    return await this.actionHandler(params, action);
  }

  private async actionHandler(params: ActionParameters, action: ActionObject) {
    try {
      await executeAction(this.client, params, action);
    } catch (e) {
      if (e.type && e.error) {
        const { error } = e as MessageError;
        if (this.errorAction) {
          await executeAction(
            this.client,
            { ...params, args: error },
            this.errorAction
          );
        }
      } else {
        console.trace(
          "[discordjs-diy] => Unknown error ocurred while tring to execute an action",
          e
        );
      }
    }
  }

  setPresence(
    activities: [string, PresenceType] | [string, PresenceType][],
    interval: number = 10 * 60 * 1000 /*10 minutes*/
  ) {
    function setActivity(this: Bot, activity: [string, PresenceType]) {
      this.client.user?.setActivity(activity[0], { type: activity[1] }) ??
        report(
          "User missing from client object, bot was unable to update presence."
        );
    }

    if (activities.length === 0)
      throw new Error("Presence list can't be empty");

    clearInterval(this.presenceInterval);
    if (activities[0] instanceof Array) {
      this.presenceInterval = setInterval(() => {
        setActivity.bind(this, pick(activities))();
      }, interval);
    } else {
      setActivity.bind(this, activities)();
    }
  }
}
