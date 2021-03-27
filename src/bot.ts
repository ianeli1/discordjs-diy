import { ActivityType, Message } from "discord.js";
import { executeAction } from "./action";
import { BotBase } from "./base";
import { Action } from "./types";
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
  private messageActions: MessageActions = {};
  private defaultAction: Action;
  private presenceInterval: NodeJS.Timeout;
  readonly prefix: string | undefined;
  readonly suffix: string | undefined;
  private ignoreCaps: boolean | undefined;
  constructor(token: string, options: BotOptions) {
    super(token);
    this.prefix = options.prefix;
    this.suffix = options.suffix;
    this.ignoreCaps = options.ignoreCaps;
    if (!this.suffix && !this.prefix)
      throw new Error(
        "You need to provide at least one of the following: prefix or suffix"
      );
    this.defaultAction = {
      trigger: "default",
    };
    this.messageHandler = this.messageHandler.bind(this);
    this.client.on("message", this.messageHandler);
  }

  setDefaultAction(
    action: Omit<Action, "trigger"> | NonNullable<Action["response"]>
  ) {
    if (typeof action === "function" || typeof action === "string")
      this.defaultAction = {
        trigger: "default",
        response: action,
      };
    else this.defaultAction = { ...action, trigger: "default" };
  }

  registerAction(
    trigger: string,
    action: Omit<Action, "trigger"> | NonNullable<Action["response"]>
  ) {
    if (typeof action === "function" || typeof action === "string")
      this.messageActions[trigger] = {
        trigger,
        response: action,
      };
    else this.messageActions[trigger] = { ...action, trigger };
    report(`Created a new action, trigger: ${trigger}`);
    return trigger;
  }

  removeAction(trigger: string) {
    delete this.messageActions[trigger];
    report(`Removed an action, trigger: ${trigger}`);
  }

  private async messageHandler(msg: Message) {
    const { content: rawContent } = msg;
    //only react to messages with prefix or suffix
    if (
      (!this.prefix ||
        rawContent.slice(0, this.prefix.length) !== this.prefix) &&
      (!this.suffix ||
        rawContent.slice(-1 * this.suffix.length) !== this.suffix)
    ) {
      return;
    }

    const content = rawContent
      .slice(this.prefix?.length)
      .slice((this.suffix && -1 * this.suffix.length) || 0)
      .trim(); //remove suffix and prefix

    let trigger = content.split(" ")[0]; //get first word

    if (this.ignoreCaps) trigger = trigger.toLocaleLowerCase();

    const args = content.slice(trigger.length).trim();

    if (!(trigger in this.messageActions)) {
      await executeAction(this.client, msg, args, this.defaultAction);
    } else {
      await executeAction(this.client, msg, args, this.messageActions[trigger]);
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
    this.client.clearInterval(this.presenceInterval);
    if (activities.length) {
      this.presenceInterval = this.client.setInterval(() => {
        setActivity.bind(this, pick(activities))();
      }, interval);
    } else {
      setActivity.bind(this, activities)();
    }
  }
}
