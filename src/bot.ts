import { ActivityType, ClientOptions, Message } from "discord.js";
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
 * Note that it can be undefined or a function that returns undefined, but this will simply be ignored
 */
export type BotAction = ActionObject | ResponseAction;

/**
 * The Bot object, pass in a Discord API token and set the options according to your needs.
 * Note that you're required to set either a prefix and/or a suffix
 */
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
    this.messageHandler = this.messageHandler.bind(this);
    this.client.on("messageCreate", this.messageHandler);
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

  private padAction(action: BotAction): ActionObject {
    if (
      typeof action === "object" &&
      ("response" in action || "reaction" in action)
    ) {
      return action;
    } else
      return {
        response: action as ResponseAction,
      };
  }
  setDefaultAction(action: BotAction) {
    return this.handler.setDefaultAction(this.padAction(action));
  }

  setErrorAction(action: BotAction) {
    this.errorAction = this.padAction(action);
  }

  registerAction(trigger: string | string[] | RegExp, action: BotAction) {
    trigger =
      this.ignoreCaps && typeof trigger === "string"
        ? trigger.toLowerCase()
        : trigger;
    report(`Created a new action, trigger: ${trigger}`);
    return this.handler.setAction(
      trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger,
      this.padAction(action)
    );
  }

  removeAction(trigger: string | RegExp | string[]) {
    report(`Removed an action, trigger: ${trigger}`);
    return this.handler.removeAction(
      trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger
    );
  }

  async createParams(
    msg: Message,
    args: string,
    trigger: string
  ): Promise<ActionParameters> {
    const expectReply: ActionParameters["expectReply"] = async (
      response,
      remove
    ) => {
      if (!response) return;
      try {
        const reply = await msg.channel.send(await response);
        return (
          await msg.channel
            .awaitMessages({
              filter: (message) => message.author.id === msg.author.id,
              max: 1,
              time: 15000,
              errors: ["time"],
            })
            .finally(() => {
              remove && reply.delete();
            })
        ).first();
      } catch (e) {
        report(
          `An error ocurred while expecting a reply from ${msg.author.tag}`,
          e
        );
        return;
      }
    };

    const dm: ActionParameters["dm"] = async (message) => {
      const channel = await msg.author.createDM();
      return message !== undefined
        ? await channel.send(await message)
        : message;
    };

    const vanillaParams: ActionParameters = {
      createEmbed: this.embed.create,
      trigger,
      msg,
      args,
      author: msg.author,
      channel: msg.channel,
      guild: msg.guild ?? undefined,
      expectReply,
      dm,
      middleware: undefined,
    };

    let moddedParams: ActionParameters = vanillaParams;

    for (const middleware of this.middlewareArray) {
      moddedParams = await middleware(moddedParams);
    }

    return moddedParams;
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

    const params = await this.createParams(msg, args, trigger);

    const action = this.handler.findAction(trigger);

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
    activities: [string, ActivityType] | [string, ActivityType][],
    interval: number = 10 * 60 * 1000 /*10 minutes*/
  ) {
    function setActivity(this: Bot, activity: [string, ActivityType]) {
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
