import { ActivityType, Message } from "discord.js";
import { executeAction } from "./action";
import { BotBase } from "./base";
import { Action, MessageError } from "./types";
import { pick, report } from "./utility";

interface BotOptions {
  prefix?: string;
  suffix?: string;
  ignoreCaps?: boolean;
}

interface MessageActions {
  [trigger: string]: Action;
}

export class Bot extends BotBase {
  messageActions: MessageActions = {};
  regexActions: {
    pattern: RegExp | string[];
    action: Action;
  }[] = [];
  defaultAction: Action;
  errorAction: Action;
  private presenceInterval: NodeJS.Timeout;
  readonly prefix: string | undefined;
  readonly suffix: string | undefined;
  private ignoreCaps: boolean | undefined;
  constructor(token: string, options: BotOptions) {
    super(token);
    this.prefix = options.ignoreCaps
      ? options.prefix?.toLowerCase()
      : options.prefix;
    this.suffix = options.ignoreCaps
      ? options.suffix?.toLowerCase()
      : options.suffix;
    this.ignoreCaps = options.ignoreCaps;
    if (!this.suffix && !this.prefix)
      throw new Error(
        "You need to provide at least one of the following: prefix or suffix"
      );
    this.defaultAction = {};
    this.messageHandler = this.messageHandler.bind(this);
    this.client.on("message", this.messageHandler);
  }
  private padAction(
    action: Omit<Action, "trigger"> | NonNullable<Action["response"]>
  ) {
    if (typeof action === "function" || typeof action === "string")
      return {
        response: action,
      };
    else return action;
  }
  setDefaultAction(action: Parameters<Bot["padAction"]>[0]) {
    this.defaultAction = this.padAction(action);
  }

  setErrorAction(action: Parameters<Bot["padAction"]>[0]) {
    this.errorAction = this.padAction(action);
  }

  registerAction(
    trigger: string | string[] | RegExp,
    action: Parameters<Bot["padAction"]>[0]
  ) {
    if (typeof trigger === "string") {
      this.messageActions[trigger] = this.padAction(action);
    } else {
      this.regexActions.push({
        action: this.padAction(action),
        pattern: trigger,
      });
    }
    report(`Created a new action, trigger: ${trigger}`);
    return trigger;
  }

  removeAction(trigger: string | RegExp | string[]) {
    if (typeof trigger === "string") {
      if (!(trigger in this.messageActions)) {
        return null;
      }
      delete this.messageActions[
        this.ignoreCaps ? trigger.toLocaleLowerCase() : trigger
      ];
    } else {
      let key: number;
      if (
        (key = this.regexActions.map((x) => x.pattern).indexOf(trigger)) === -1
      ) {
        return null;
      }
      delete this.regexActions[key];
    }
    report(`Removed an action, trigger: ${trigger}`);
    return trigger;
  }

  private findRegex(trigger: string) {
    return this.regexActions.find(({ pattern }) => {
      if (pattern instanceof Array) {
        return pattern
          .map((x) => (this.ignoreCaps ? x.toLowerCase() : x))
          .includes(trigger);
      }

      return pattern.test(trigger);
    })?.action;
  }

  private async messageHandler(msg: Message) {
    const { content: rawContent } = msg;
    //only react to messages with prefix or suffix
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

    try {
      let action: Action | undefined;
      if (trigger in this.messageActions) {
        await executeAction(
          this.client,
          msg,
          args,
          this.messageActions[trigger]
        );
      } else if ((action = this.findRegex(trigger))) {
        await executeAction(this.client, msg, args, action);
      } else {
        await executeAction(this.client, msg, args, this.defaultAction);
      }
    } catch (e) {
      if (e.type && e.error) {
        const { error } = e as MessageError;
        if (this.errorAction) {
          await executeAction(this.client, msg, error, this.errorAction);
        }
      } else {
        console.trace(
          "Unknown error ocurred while tring to execute an action",
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

    this.client.clearInterval(this.presenceInterval);
    if (activities[0] instanceof Array) {
      this.presenceInterval = this.client.setInterval(() => {
        setActivity.bind(this, pick(activities))();
      }, interval);
    } else {
      setActivity.bind(this, activities)();
    }
  }
}
