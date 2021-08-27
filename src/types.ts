import {
  EmojiResolvable,
  Guild,
  Message,
  MessageOptions,
  MessagePayload,
  TextBasedChannels,
  User,
} from "discord.js";
import { Embed } from ".";

interface GenericObject {
  [name: string]: any;
}

/**Object passed to the action functions on every trigger */
export interface ActionParameters<
  MW extends GenericObject | undefined = undefined
> {
  /**Arguments from the command executed */
  args: string;
  /**Keyword used to trigger the command */
  trigger: string;
  /**
   * [Only used for onError actions]
   * Contains the full error obtained from the catch
   */
  error?: any;

  /**Message that triggered this action */
  msg: Message;
  /**The user who triggered the action */
  author: User;
  /**The channel this command will be sent in */
  channel: TextBasedChannels;
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
  response?: ResponseAction;
  reaction?: ReactionAction;
  onError?: ActionObject;
}

export interface MessageError {
  type: "reaction" | "response";
  error: any;
}
