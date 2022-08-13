import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import autobind from "autobind-decorator";
import { Routes } from "discord-api-types/v10";
import { Bot } from "./bot";
import { ActionObject, CommandCollection } from "./types";

export class ApplicationCommands {
  constructor(readonly bot: Bot) {}

  readonly rest = new REST({ version: "10" }).setToken(this.bot.token);

  //Creates a new Slash command JSON to send to the API
  static createSlashCommandParams(
    name: string,
    description: string,
    parameters: ActionObject["parameters"],
    classType: typeof SlashCommandBuilder | typeof SlashCommandSubcommandBuilder
  ) {
    const isUppercase = (t: string) => /[A-Z]/.test(t);
    if (isUppercase(name))
      throw new Error(
        `[CreateSlashCommandParams] => Trigger "${name}" must not have uppercase letters`
      );

    const command = new classType()
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
            throw new Error(
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

    return command;
  }

  @autobind
  commandsRoute(guildId?: string) {
    const appId = this.bot.client.application?.id;
    if (!appId) throw "Aplication ID missing!";
    return guildId
      ? Routes.applicationGuildCommands(appId, guildId)
      : Routes.applicationCommands(appId);
  }

  @autobind
  overwriteCommands(
    commands: ReturnType<CommandCollection[0]["toJSON"]>[],
    guildId?: string
  ) {
    return this.rest.put(this.commandsRoute(guildId), {
      body: commands,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  @autobind
  async register(guilds?: string | string[]) {
    const _guilds = typeof guilds === "string" ? [guilds] : guilds;
    const commands = this.bot.compileCommands();

    const body = commands
      .concat(this.bot.interactionHandler.compileContextMenuActions())
      .map((builder) => builder.toJSON());

    try {
      if (_guilds) {
        for (const guild of _guilds) {
          await this.overwriteCommands(body, guild);
        }
        return commands;
      } else {
        this.overwriteCommands(body);
      }

      this.bot.report(
        `[commands] => ${commands.map((x) => x.name)} registered`
      );
      return commands;
    } catch (e) {
      e.payload = body;
      throw e;
    }
  }
}
