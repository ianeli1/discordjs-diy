import { ActionObject } from "./types";
import { SlashCommandBuilder } from "@discordjs/builders";
import { report } from "./utility";
import { Router } from "./router";

type HandlerContent = ActionObject | Router;

interface MessageActions {
  [trigger: string]: HandlerContent;
}

type RegexActions = Map<RegExp, HandlerContent>;

type TriggerType = string | RegExp;

export class CommandsHandler {
  private stringActions: MessageActions;
  private regexActions: RegexActions;
  private defaultAction: ActionObject | undefined;
  readonly commands: ReturnType<SlashCommandBuilder["toJSON"]>[];

  constructor() {
    this.stringActions = {};
    this.regexActions = new Map();
    this.defaultAction = {};
    this.commands = [];
    this.findAction = this.findAction.bind(this);
    this.setAction = this.setAction.bind(this);
    this.removeAction = this.removeAction.bind(this);
    this.createSlashCommandParams = this.createSlashCommandParams.bind(this);
  }

  //Creates a new Slash command JSON to send to the API
  createSlashCommandParams(
    name: string,
    description: string,
    parameters: ActionObject["parameters"]
  ) {
    const isUppercase = (t: string) => /[A-Z]/.test(t);
    if (isUppercase(name))
      throw new Error(
        `[CreateSlashCommandParams] => Trigger "${name}" must not have uppercase letters`
      );

    const command = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description || "A command");

    if (parameters) {
      parameters.forEach((param) => {
        if (isUppercase(param.name))
          throw new Error(
            `[CreateSlashCommandParams] => Parameter "${param.name}" must not have uppercase letters`
          );
        switch (param.type ?? "STRING") {
          case "STRING":
            {
              command.addStringOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;
          case "BOOLEAN":
            {
              command.addBooleanOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;
          case "INTEGER":
            {
              command.addIntegerOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;
          case "MENTIONABLE":
            {
              command.addMentionableOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;

          case "NUMBER":
            {
              command.addNumberOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;

          case "ROLE":
            {
              command.addRoleOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;

          case "USER":
            {
              command.addUserOption((option) =>
                option
                  .setName(param.name)
                  .setDescription(description || "A command")
                  .setRequired(true)
              );
            }
            break;

          default:
            report(
              `[CommandsHandler] => Parameter type "${param.type}" is unsupported`
            );
        }
      });
    } else {
      command.addStringOption((option) =>
        option
          .setName("arguments")
          .setRequired(true)
          .setDescription(description || "A command")
      );
    }

    return command.toJSON();
  }

  setAction(trigger: TriggerType, action: HandlerContent) {
    if (typeof trigger === "string") {
      this.stringActions[trigger] = action;

      //FIXME //Create new slash command JSON, ignores Regex commands as they're not supported

      // this.commands.push(
      //   this.createSlashCommandParams(
      //     trigger,
      //     action.description ?? "",
      //     action.parameters
      //   )
      // );
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
