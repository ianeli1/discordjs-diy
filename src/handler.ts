import { ActionObject } from "./types";

interface MessageActions {
  [trigger: string]: ActionObject;
}

type RegexActions = Map<RegExp, ActionObject>;

type TriggerType = string | RegExp;

export class CommandsHandler {
  private stringActions: MessageActions;
  private regexActions: RegexActions;
  private defaultAction: ActionObject;

  constructor() {
    this.stringActions = {};
    this.regexActions = new Map();
    this.defaultAction = {};

    this.findAction = this.findAction.bind(this);
    this.setAction = this.setAction.bind(this);
    this.removeAction = this.removeAction.bind(this);
  }

  setAction(trigger: TriggerType, action: ActionObject) {
    if (typeof trigger === "string") {
      this.stringActions[trigger] = action;
      return trigger;
    }
    this.regexActions.set(trigger, action);
    return trigger;
  }

  setDefaultAction(action: ActionObject) {
    this.defaultAction = action;
    return action;
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

  findAction(trigger: string) {
    if (trigger in this.stringActions) {
      return this.stringActions[trigger];
    }
    return (
      [...this.regexActions.entries()].find(([regex]) =>
        regex.test(trigger)
      )?.[1] ?? this.defaultAction
    );
  }
}
