import { Client, EmojiResolvable, MessageEmbed } from "discord.js";
import { ActionObject, ActionParameters, MessageError } from "./types";
import { handleEmoji, report } from "./utility";

export async function executeAction(
  client: Client,
  params: ActionParameters,
  action: ActionObject
) {
  const { reaction, response } = action;
  const { msg, args } = params;
  let error: MessageError | undefined = undefined;
  report(
    `Command triggered, user: ${msg.author.tag}, content: ${
      msg.content
    }, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
  );

  if (response) {
    try {
      let reply: string | MessageEmbed | (string | MessageEmbed)[] | undefined;
      if (typeof response === "string") reply = response;
      else if (typeof response === "function") reply = await response(params);
      reply && (await msg.channel.send(reply));
    } catch (e) {
      console.trace(
        `An unhandled error ocurred while triggering an action response, trigger: ${msg.content}\n`,
        e
      );
      error = {
        type: "response",
        error: e,
      };
    }
  }

  if (reaction) {
    try {
      let emoji: EmojiResolvable | undefined;
      if (typeof reaction === "string") emoji = handleEmoji(client, reaction);
      else if (typeof reaction === "function")
        emoji = handleEmoji(client, await reaction(params));
      emoji && (await msg.react(emoji));
    } catch (e) {
      console.trace(
        `An unhandled error ocurred while triggering an action reaction, trigger: ${msg.content}\n`,
        e
      );
      error = {
        type: "reaction",
        error: e,
      };
    }
  }

  if (error) {
    throw error;
  }
}
