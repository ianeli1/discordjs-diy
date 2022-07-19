import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from "@discordjs/builders";
import { APIRole } from "discord-api-types/v9";
import {
  ApplicationCommandOptionType,
  ButtonInteraction,
  EmojiResolvable,
  Guild,
  GuildMember,
  Interaction,
  Message,
  MessageActionRow,
  MessageButtonOptions,
  MessageOptions,
  MessagePayload,
  MessageSelectMenuOptions,
  Role,
  SelectMenuInteraction,
  TextBasedChannel,
  User,
} from "discord.js";
import { Embed } from "./embed";
import { Router } from "./router";

interface GenericObject {
  [name: string]: any;
}

type NonNullableObject<T> = {
  [K in keyof T]: Exclude<T[K], null>;
};

/**Object passed to the action functions on every trigger */
export interface ActionParameters<
  MW extends GenericObject | undefined = undefined
> {
  /**Arguments from the command executed, undefined for slash commands unless no parameter definition was provided */
  args?: string;

  /**Parameters from the slash command
   * Will contain a property "arguments" for legacy commands and slash commands without parameter definition
   */
  parameters: Record<
    string,
    string | boolean | User | GuildMember | Role | APIRole | number | undefined
  >;

  /**Keyword used to trigger the command */
  trigger: string;
  /**
   * [Only used for onError actions]
   * Contains the full error obtained from the catch
   */
  error?: any;

  /**Message that triggered this action */
  msg: Message | Interaction;
  /**The user who triggered the action */
  author: User;
  /**The channel this command will be sent in */
  channel?: TextBasedChannel;
  /**The server */
  guild?: Guild;

  /**
   * Used for multiple step commands,
   * the first argument is a SendableMessage that will be sent to the channel
   * the second optional argument defines if the message should be deleted after receiving a reply/failing
   * resolves to undefined if an error occurs
   */
  expectReply: (
    msg: SendableMessage,
    remove?: boolean
  ) => Promise<Message | undefined>;

  /**Creates an embed object using the embed.create method of the embed object passed into the Bot */
  createEmbed: Embed["create"];

  /**Sends a DM to the author of the message, resolves to undefined if an error occurs */
  dm: (msg: SendableMessage) => Promise<Message | undefined>;

  subscribe(
    componentOptions: NonNullable<
      | NonNullableObject<NonNullable<Omit<MessageButtonOptions, "customId">>>[]
      | Partial<MessageButtonOptions>
      | Partial<MessageSelectMenuOptions>
    >,
    action: (
      params: ActionParameters,
      interaction: ButtonInteraction | SelectMenuInteraction,
      value: number | string
    ) => SendableMessage | undefined,
    idle?: number,
    expectFromUserIds?: string[]
  ): MessageActionRow;

  /**
   * Creates a minijob that will be run once a response is created
   *
   * This does nothing if an action has no response
   *
   * @param waitFor value to be passed on to thenDo. Receives the newly created response
   * @param thenDo a function that will receive the newly created response + the return value of waitFor
   */
  asyncEffect(
    doAfter: (
      params: Omit<ActionParameters, "msg"> & { msg: Message }
    ) => Promise<void> | void
  ): void;

  /**Internal, used for `asyncEffect` */
  __asyncJobs: {
    doAfter: Parameters<ActionParameters["asyncEffect"]>[0];
  }[];

  middleware?: MW;
}

export type ParametersMiddleWare<
  T extends GenericObject | undefined = undefined
> = (
  params: ActionParameters
) => Promise<ActionParameters<T>> | ActionParameters<T>;

export type SendableMessage =
  | string
  | MessagePayload
  | MessageOptions
  | Promise<string | MessagePayload | MessageOptions>;

export type SendableEmoji =
  | EmojiResolvable
  | Promise<EmojiResolvable | string>
  | string
  | undefined;

export type ResponseAction =
  | ((params: ActionParameters) => SendableMessage | undefined)
  | SendableMessage;

export type ReactionAction =
  | ((params: ActionParameters) => SendableEmoji)
  | SendableEmoji;

export interface ActionObject {
  /**Description of the command */
  description?: string;

  response?: ResponseAction;
  reaction?: ReactionAction;
  onError?: ActionObject;

  /**The slash command parameters to be generated, defaults to a string parameter called "Arguments" */
  parameters?: {
    name: string;

    /**The type of this parameter, defaults to STRING */
    type?: ApplicationCommandOptionType;

    description?: string;
  }[];
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
 *  - A router
 *
 * Returning undefined for slash commands will result in an error
 * Note that it can be undefined or a function that returns undefined, but this will simply be ignored
 */
export type BotAction = ActionObject | ResponseAction | Router;

export type CommandCollection = (
  | SlashCommandBuilder
  | SlashCommandSubcommandBuilder
  | SlashCommandSubcommandGroupBuilder
)[];

/**
 * Callback. Called when a possible typo is detected and gets passed 3 (or less) most relevant suggestions
 */
export type TypoAction = (
  params: ActionParameters,
  similar: string[]
) => SendableMessage;

export interface TypoOptions {
  maxDistance?: number;
  maxSuggestions?: number;
}
