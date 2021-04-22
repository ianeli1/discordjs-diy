import {
  Channel,
  EmojiResolvable,
  Guild,
  Message,
  MessageEmbed,
  User,
} from "discord.js";
import { Embed } from ".";

export interface ActionParameters {
  createEmbed: Embed["create"];
  msg: Message;
  args: string;
  author: User;
  channel: Channel;
  guild?: Guild;
  expectReply: (
    msg: SendableMessage,
    remove?: boolean
  ) => Promise<Message | undefined>;
}

export type SendableMessage =
  | string
  | MessageEmbed
  | (string | MessageEmbed)[]
  | Promise<MessageEmbed | string>
  | Promise<(string | MessageEmbed)[]>;

export type SendableEmoji =
  | EmojiResolvable
  | Promise<EmojiResolvable | string>
  | string;

export type ResponseAction =
  | ((params: ActionParameters) => SendableMessage)
  | SendableMessage;

export type ReactionAction =
  | ((params: ActionParameters) => SendableEmoji)
  | SendableEmoji;

export interface ActionObject {
  response?: ResponseAction;
  reaction?: ReactionAction;
}

export interface MessageError {
  type: "reaction" | "response";
  error: any;
}
