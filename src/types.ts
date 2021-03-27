import { EmojiResolvable, Message, MessageEmbed } from "discord.js";

export interface Action {
  trigger: string;
  response?:
    | ((
        msg: Message,
        args: string
      ) => string | MessageEmbed | (string | MessageEmbed)[])
    | string;

  reaction?: ((msg: Message, args: string) => EmojiResolvable) | string;
}
