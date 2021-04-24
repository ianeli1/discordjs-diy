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
  args: string;
  trigger: string;
  error?: any;

  msg: Message;
  author: User;
  channel: Channel;
  guild?: Guild;

  expectReply: (
    msg: SendableMessage,
    remove?: boolean
  ) => Promise<Message | undefined>;
  createEmbed: Embed["create"];
  dm: (msg: SendableMessage) => Promise<void>;
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
  onError?: ActionObject;
}

export interface MessageError {
  type: "reaction" | "response";
  error: any;
}
