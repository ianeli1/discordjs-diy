import { ActionObject, TypoOptions } from "./types";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Router } from "./router";
import { sortByDistance } from "./utility";

type HandlerContent = ActionObject | Router;

interface MessageActions {
  [trigger: string]: HandlerContent;
}

type RegexActions = Map<RegExp, HandlerContent>;

type TriggerType = string | RegExp;

export class CommandsHandler {
  readonly stringActions: MessageActions;
  private regexActions: RegexActions;
  private _defaultAction: ActionObject | undefined;
  readonly commands: ReturnType<SlashCommandBuilder["toJSON"]>[];

  constructor() {
    this.stringActions = {};
    this.regexActions = new Map();
    this._defaultAction = {};
    this.commands = [];
    this.findAction = this.findAction.bind(this);
    this.setAction = this.setAction.bind(this);
    this.removeAction = this.removeAction.bind(this);
  }

  setAction(trigger: TriggerType, action: HandlerContent) {
    if (typeof trigger === "string") {
      this.stringActions[trigger] = action;
      return trigger;
    }
    this.regexActions.set(trigger, action);

    return trigger;
  }

  setDefaultAction(action: ActionObject) {
    this._defaultAction = action;
    return action;
  }

  get defaultAction(){
    return this._defaultAction
  }

  removeAction(trig: TriggerType) {
    if (typeof trig === "string") {
      if (trig in this.stringActions) {
        delete this.stringActions[trig];
        return trig;
      }
      return;
    }
    const key = [...this.regexActions.keys()].find(
      (reg) => reg.source === trig.source && reg.flags === trig.flags
    );
    if (key) {
      this.regexActions.delete(key);
      return trig;
    }
    return;
  }

  /**
   * Returns an array of similar triggers to the one provided and sorts them by similarity
   * Only supports string triggers
   */
  findSimilar(pattern: string, {maxDistance, maxSuggestions}: TypoOptions) {
    const triggers = Object.keys(this.stringActions);
    return sortByDistance(pattern, triggers, maxDistance).slice(0, maxSuggestions);
  }

  /**
   * Tries to find an action in this handler that matches the `trigger`
   */
  findAction(trigger: string) {
    if (trigger in this.stringActions) {
      return this.stringActions[trigger];
    }
    return (
      [...this.regexActions.entries()].find(([regex]) =>
        regex.test(trigger)
      )?.[1] ?? this._defaultAction
    );
  }
}
