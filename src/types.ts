import { EmojiResolvable, Message, MessageEmbed } from "discord.js";

export interface Action {
  response?:
    | ((
        msg: Message,
        args: string
      ) =>
        | string
        | MessageEmbed
        | (string | MessageEmbed)[]
        | Promise<string>
        | Promise<MessageEmbed>
        | Promise<(string | MessageEmbed)[]>)
    | string;

  reaction?:
    | ((
        msg: Message,
        args: string
      ) => EmojiResolvable | Promise<EmojiResolvable>)
    | string;
}
