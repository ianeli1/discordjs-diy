import { APIRole } from "discord-api-types";
import {
  ApplicationCommandOptionType,
  ButtonInteraction,
  EmojiResolvable,
  Guild,
  GuildMember,
  Interaction,
  Message,
  MessageActionRow,
  MessageButton,
  MessageOptions,
  MessagePayload,
  MessageSelectMenu,
  Role,
  SelectMenuInteraction,
  TextBasedChannels,
  User,
} from "discord.js";
import { Embed } from "./embed";

interface GenericObject {
  [name: string]: any;
}

// type NonNullableObject<T> = {
//   [K in keyof T]: Exclude<T[K], null>;
// };

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
    string | boolean | User | GuildMember | Role | APIRole | number
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
  channel?: TextBasedChannels;
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
      // | Omit<
      //     NonNullableObject<
      //       NonNullable<ConstructorParameters<typeof MessageButton>[0]>
      //     >,
      //     "customId"
      //   >[]
      | Partial<ConstructorParameters<typeof MessageButton>[0]>
      | Partial<ConstructorParameters<typeof MessageSelectMenu>[0]>
    >,
    action: (
      params: ActionParameters,
      interaction: ButtonInteraction | SelectMenuInteraction
    ) => SendableMessage | undefined,
    idle?: number
  ): MessageActionRow;

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

export interface MessageError {
  type: "reaction" | "response";
  error: any;
}
