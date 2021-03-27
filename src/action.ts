import { Client, Message, EmojiResolvable, MessageEmbed } from "discord.js";
import { Action } from "./types";
import { handleEmoji, report } from "./utility";

export async function executeAction(
  client: Client,
  msg: Message,
  args: string,
  action: Action
) {
  const { reaction, response, trigger } = action;
  report(
    `Command triggered, user: ${
      msg.author.tag
    }, trigger: ${trigger}, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
  );

  try {
    let emoji: EmojiResolvable | undefined;
    if (typeof reaction === "string") emoji = handleEmoji(client, reaction);
    else if (typeof reaction === "function")
      emoji = handleEmoji(client, reaction(msg, args));
    emoji && (await msg.react(emoji));

    let reply: string | MessageEmbed | (string | MessageEmbed)[] | undefined;
    if (typeof response === "string") reply = response;
    else if (typeof response === "function") reply = response(msg, args);
    reply && (await msg.channel.send(reply));
  } catch (e) {
    console.trace(
      `An unhandled error ocurred while triggering an action, trigger: ${trigger}\n`,
      e
    );
  }
}
