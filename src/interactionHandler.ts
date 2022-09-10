import autobind from "autobind-decorator";
import {
  CommandInteraction,
  ContextMenuInteraction,
  Interaction,
  Message,
  MessageComponentInteraction,
} from "discord.js";
import { Bot } from "./bot";
import { ComponentHandler } from "./componentHandler";
import {
  ActionObject,
  ActionParameters,
  ContextMenuType,
  ContextMenuResponse,
  ContextMenuActionParameters,
} from "./types";
import { ContextMenuCommandBuilder } from "@discordjs/builders";
import { ApplicationCommandType } from "discord-api-types/v10";

interface ContextMenuActionObject {
  name: string;
  type: ContextMenuType;
  action: ContextMenuResponse<ContextMenuType>;
}

export class InteractionHandler {
  contextMenuActions: Map<string, ContextMenuActionObject> = new Map();

  constructor(public bot: Bot, public componentHandler: ComponentHandler) {}

  report(...stuff: string[]) {
    this.bot.report(`[InteractionHandler] =>`, ...stuff);
  }

  @autobind
  async handleInteraction(interaction: Interaction) {
    if (interaction.isMessageComponent()) {
      return await this.handleMessageComponentInteraction(interaction);
    }

    if (interaction.isCommand()) {
      return await this.handleSlashCommandInteraction(interaction);
    }

    if (interaction.isContextMenu()) {
      return await this.handleContextMenuInteraction(interaction);
    }
  }

  @autobind
  onContextMenu<T extends ContextMenuType>(
    type: T,
    name: string,
    action: ContextMenuResponse<T>
  ) {
    const id = `${name}_${type}`;
    if (this.contextMenuActions.has(id)) {
      this.report(
        `Context menu action ${name} of type ${type} already exists, overwriting...`
      );
    }
    this.contextMenuActions.set(id, {
      action,
      type,
      name,
    });
  }

  @autobind
  compileContextMenuActions() {
    const isValidType = (x: string): x is ContextMenuType =>
      x === "user" || x === "message";

    const compiledResult: ContextMenuCommandBuilder[] = [];

    for (const id of this.contextMenuActions.keys()) {
      const id_split = id.split("_");
      const type = id_split.pop();
      if (!type || !isValidType(type)) {
        throw new Error(
          `Context menu action ${id} has an invalid type: ${type}`
        );
      }
      const name = id_split.join("_");

      const ctxCommand = new ContextMenuCommandBuilder()
        .setName(name)
        .setType(
          type === "user"
            ? ApplicationCommandType.User
            : ApplicationCommandType.Message
        );

      compiledResult.push(ctxCommand);
    }

    return compiledResult;
  }

  @autobind
  private async handleSlashCommandInteraction(interaction: CommandInteraction) {
    interaction
      .deferReply()
      .catch((e) =>
        this.report(
          `An error ocurred while deferring interaction ${interaction.id}: ${e?.message}`
        )
      );
    const action = this.bot.router.findAction(
      this.constructFullTrigger(interaction)
    );

    if (!action) {
      return;
    }

    const params: ActionParameters["parameters"] = this.constructParameters(
      interaction,
      action.parameters
    );

    try {
      const actionParameters = await this.bot.createParams(
        interaction,
        params.arguments as string | undefined,
        params,
        interaction.commandName,
        action.router
      );

      return await this.bot.handleAction(actionParameters, action);
    } catch (e) {
      this.report(
        `An unhandled error ocurred while trying to handle interaction. ${interaction.type}`,
        e
      );
    }
  }

  /**
   * Handles all interactions triggered by clicking on a message component (button/select menu)
   * @param interaction
   */
  @autobind
  private async handleMessageComponentInteraction(
    interaction: MessageComponentInteraction
  ) {
    interaction.deferUpdate().catch(() => {});
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
        : !subscription.additionalUserIds.includes(interaction.member?.user.id))
    ) {
      return;
    }
    const interactionActionParameters = await this.bot.createParams(
      interaction.message as Message,
      undefined,
      {},
      interaction.customId,
      this.bot.router
    );
    let msgReply = await subscription.action(
      interactionActionParameters,
      interaction,
      interaction.isButton()
        ? +(interaction.customId.split("-").pop() ?? 0)
        : interaction.isSelectMenu()
        ? interaction.values[0]
        : 0
    );

    msgReply &&
      (subscription.msg instanceof Message
        ? await (interaction.message as Message).edit(msgReply)
        : await subscription.msg.editReply(msgReply));
    this.componentHandler.renewSubscription(interaction.customId, undefined);
  }

  private async handleContextMenuInteraction(
    interaction: ContextMenuInteraction
  ) {
    await interaction.deferReply();

    const id = `${interaction.commandName}_${
      interaction.isUserContextMenu() ? "user" : "message"
    }`;
    const action = this.contextMenuActions.get(id);

    if (!action) {
      //log?
      return;
    }

    const ctxActionParams: ContextMenuActionParameters =
      await this.constructActionParameters(interaction);

    return await this.bot.handleAction(
      //@ts-expect-error
      new this.bot.Action(ctxActionParams, action.action)
    );
  }

  constructFullTrigger(interaction: CommandInteraction) {
    let commandName = interaction.commandName;

    const group = interaction.options.getSubcommandGroup(false);
    if (group) {
      commandName += ` ${group}`;
    }

    const sub = interaction.options.getSubcommand(false);
    if (sub) {
      commandName += ` ${sub}`;
    }

    return commandName;
  }

  constructParameters(
    interaction: Interaction,
    parameters?: ActionObject["parameters"]
  ) {
    try {
      const params: ActionParameters["parameters"] = {};
      if (!interaction.isCommand()) {
        return params;
      }
      if (!parameters) {
        params["arguments"] =
          interaction.options.getString(
            "arguments",
            false /** not required */
          ) ?? undefined;
        return params;
      }
      for (const param of parameters) {
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
            const mentionable = interaction.options.getMentionable(param.name);
            //@ts-ignore todo idk
            mentionable && (params[param.name] = mentionable);
            break;

          default:
            const val = interaction.options.get(param.name)?.value;
            val && (params[param.name] = val);
        }
      }
      return params;
    } catch (e) {
      this.report(
        `An error ocurred while constructing parameters. InteractionType: ${interaction.type}, channelId: ${interaction.channelId}@guild(${interaction.guildId}) by ${interaction.member?.user.username}`,
        e
      );
      return {};
    }
  }

  async constructActionParameters(
    interaction: ContextMenuInteraction
  ): Promise<ContextMenuActionParameters> {
    let paramsType: ContextMenuActionParameters["type"];
    if (interaction.isMessageContextMenu()) {
      paramsType = "message";
    } else if (interaction.isUserContextMenu()) {
      paramsType = "user";
    } else {
      throw new Error(
        `Unsupported type of msg/interaction: "${interaction["constructor"].name}"`
      );
    }
    return {
      ...(await this.bot.createBarebonesParams(interaction)),
      type: paramsType,
      author: interaction.user,
      name: interaction.commandName,
      interaction,
      targetUser: interaction.isUserContextMenu()
        ? interaction.targetUser
        : undefined,
      targetMember: interaction.isUserContextMenu()
        ? interaction.targetMember
        : undefined,
      targetMessage: interaction.isMessageContextMenu()
        ? interaction.targetMessage
        : undefined,
    };
  }
}
