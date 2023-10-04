import {
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from "@discordjs/builders";
import { APIRole } from "discord-api-types/v9";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonComponentData,
  CommandInteraction,
  ContextMenuCommandInteraction,
  EmojiResolvable,
  Guild,
  GuildMember,
  Interaction,
  LinkButtonComponentData,
  Message,
  MessageComponentInteraction,
  MessageContextMenuCommandInteraction,
  MessagePayload,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuComponentData,
  TextBasedChannel,
  User,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { Bot } from ".";
import { Embed } from "./embed";
import { Router } from "./router";

interface GenericObject {
  [name: string]: any;
}

type NonNullableObject<T> = {
  [K in keyof T]: Exclude<T[K], null>;
};

export type ActionParameters = StandardActionParameters &
  (TextActionParameters | CommandActionParameters);

type ActionTypes = "text" | "command";

export interface StandardActionParameters extends BaseActionParameters {
  msg: Message | CommandInteraction;
}

interface TextActionParameters {
  /**
   * Identifies the type of this action, if it's invoked by slash command ("command") or legacy text command ("text")
   */
  type: "text";
  msg: Message;
}
interface CommandActionParameters {
  /**
   * Identifies the type of this action, if it's invoked by slash command ("command") or legacy text command ("text")
   */
  type: "command";
  msg: CommandInteraction;
}

/**Object passed to the action functions on every trigger */
interface BaseActionParameters extends BarebonesActionParameters {
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

  /**Sends a DM to the author of the message, resolves to undefined if an error occurs */
  dm: (msg: SendableMessage) => Promise<Message | undefined>;

  /**Creates a new message component which can then be attached to a response (eg. via `createEmbed({components: []})`)
   * Any content returned will be used to edit the newly created message via msg.edit or msg.editReply
   * It supports both buttons and select menus
   * Note that these subscriptions get reset when the bot resets, and have a default timeout of 60 seconds
   * You can also limit who has access to the component, by default only the command invoker can trigger.
   * Pass an array of user IDs to the last parameter to change this
   */
  subscribe: SubscribeFn<
    MyButtonComponentData | StringSelectMenuComponentData,
    ButtonBuilder | StringSelectMenuBuilder
  >;

  /**Run an action through the pipeline with the previous ActionParameters
   * Optionally add a second parameter to override the parameters
   *
   * eg.
   * ```ts
   * runAction(coolAction, {args: newId})
   * ```
   */
  runAction(action: ResponseAction, params: ActionParameters): void;
}

export type MyButtonComponentData = Omit<
  Exclude<ButtonComponentData, LinkButtonComponentData>,
  "customId"
>;

export type SubscribeFn<
  T extends MyButtonComponentData | StringSelectMenuComponentData,
  C extends T extends MyButtonComponentData
    ? ButtonBuilder
    : StringSelectMenuBuilder
> = (
  componentOptions: NonNullable<
    NonNullableObject<Extract<T, MyButtonComponentData>>[] | T
  >,
  /**
   * `params.msg` contains the newly created message this component will be attached to
   */
  action: (
    params: ActionParameters,
    interaction: MessageComponentInteraction,
    value: T extends MyButtonComponentData ? number : string
  ) => SendableMessage | Promise<void> | void,
  idle?: number,
  expectFromUserIds?: string[]
) => ActionRowBuilder<C>;

export interface BarebonesActionParameters {
  bot: Bot;

  type: ActionTypes | ContextMenuType;
  /**The user who triggered the action */
  author: User;
  /**The channel this command will be sent in */
  channel?: TextBasedChannel;
  /**The server */
  guild?: Guild;

  middleware: GenericObject;

  /**Creates an embed object using the embed.create method of the embed object passed into the Bot */
  createEmbed: Embed["create"];

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

  /** @internal, used for `asyncEffect` */
  __asyncJobs: {
    doAfter: Parameters<BaseActionParameters["asyncEffect"]>[0];
  }[];
}

export type ParametersMiddleWare = (
  params: BarebonesActionParameters,
  msgOrInteraction: Message | Interaction
) => Promise<BarebonesActionParameters> | BarebonesActionParameters;

export type SendableMessage =
  | string
  | MessagePayload
  | BaseMessageOptions
  | Promise<string | MessagePayload | BaseMessageOptions>;

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
  | ContextMenuCommandBuilder
)[];

/**
 * Callback. Called when a possible typo is detected and gets passed 3 (or less) most relevant suggestions
 */
export type TypoAction = (
  params: ActionParameters,
  similar: string[]
) => SendableMessage;

/**
 * Called when a slash command takes longer than the set timeout to process.
 * Its result is then edited to the real expected message.
 */
export type SlashCommandLoadingAction =
  | ((params: ActionParameters) => Awaited<SendableMessage>)
  | Awaited<SendableMessage>;

export interface TypoOptions {
  maxDistance?: number;
  maxSuggestions?: number;
}

export type ContextMenuType = "message" | "user";

export type ContextMenuResponse<T extends ContextMenuType> = (
  params: T extends "message"
    ? MessageContextMenuActionParameters
    : UserContextMenuActionParameters
) => SendableMessage;

export type ContextMenuActionParameters =
  | UserContextMenuActionParameters
  | MessageContextMenuActionParameters
  | BaseContextMenuActionParameters;

type MessageContextMenuActionParameters = Omit<
  BaseContextMenuActionParameters,
  "type" | "interaction" | "targetUser" | "targetMember" | "targetMessage"
> & {
  type: "message";
  interaction: MessageContextMenuCommandInteraction;
  targetMessage: MessageContextMenuCommandInteraction["targetMessage"];
  targetUser: never;
  targetMember: never;
};

type UserContextMenuActionParameters = Omit<
  BaseContextMenuActionParameters,
  "type" | "interaction" | "targetUser" | "targetMember" | "targetMessage"
> & {
  type: "user";
  interaction: UserContextMenuCommandInteraction;
  targetUser: User;
  targetMember: UserContextMenuCommandInteraction["targetMember"];
  targetMessage: never;
};

export interface BaseContextMenuActionParameters
  extends BarebonesActionParameters {
  name: string;
  type: ContextMenuType;
  interaction: ContextMenuCommandInteraction;
  targetUser?: User;
  targetMember?: UserContextMenuCommandInteraction["targetMember"];
  targetMessage?: MessageContextMenuCommandInteraction["targetMessage"];
}
