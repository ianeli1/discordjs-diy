import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest/dist/lib/REST";
import { Routes } from "discord.js/node_modules/discord-api-types/v9";
import { Bot } from "./bot";
import { ActionObject } from "./types";

export class SlashCommands {
    //Creates a new Slash command JSON to send to the API
    static createSlashCommandParams(
        name: string,
        description: string,
        parameters: ActionObject["parameters"],
        classType:
            | typeof SlashCommandBuilder
            | typeof SlashCommandSubcommandBuilder
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

    static async register(bot: Bot, token: string, guilds: string[]) {
        const rest = new REST({ version: "9" }).setToken(token);
        const commands = bot.compileCommands();
        const body = JSON.stringify(commands);
        try {
            if (!bot.client.application?.id) throw "Aplication ID missing!";
            if (guilds) {
                for (const guild of guilds) {
                    await rest.put(
                        Routes.applicationGuildCommands(
                            bot.client.application.id,
                            guild
                        ),
                        {
                            body,
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );
                }
                return commands;
            } else {
                await rest.put(
                    Routes.applicationCommands(bot.client.application.id),
                    {
                        body,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            bot.report(
                `[registerSlashCommands] => ${commands.map(
                    (x) => x.name
                )} registered`
            );
            return commands;
        } catch (e) {
            e.payload = body;
            throw e;
        }
        return;
    }
}
