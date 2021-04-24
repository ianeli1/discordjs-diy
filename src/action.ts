import { Client, EmojiResolvable, MessageEmbed } from "discord.js";
import {
  ActionObject,
  ActionParameters,
  MessageError,
  ReactionAction,
  ResponseAction,
} from "./types";
import { handleEmoji, report } from "./utility";

export async function executeAction(
  client: Client,
  params: ActionParameters,
  action: ActionObject
) {
  async function execResponse(response: ResponseAction) {
    let reply: string | MessageEmbed | (string | MessageEmbed)[] | undefined;
    if (typeof response === "string") reply = response;
    else if (typeof response === "function") reply = await response(params);
    reply && (await msg.channel.send(reply));
  }

  async function execReaction(reaction: ReactionAction) {
    let emoji: EmojiResolvable | undefined;
    if (typeof reaction === "string") emoji = handleEmoji(client, reaction);
    else if (typeof reaction === "function")
      emoji = handleEmoji(client, await reaction(params));
    emoji && (await msg.react(emoji));
  }

  const { reaction, response, onError } = action;
  const { msg, args, trigger } = params;
  let error: MessageError | undefined = undefined;
  report(
    `Command triggered, user: ${
      msg.author.tag
    }, trigger: ${trigger}, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
  );

  if (response) {
    try {
      await execResponse(response);
    } catch (e) {
      if (onError?.response) {
        params.error = e;
        await execResponse(onError.response);
      }
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
      await execReaction(reaction);
    } catch (e) {
      if (onError?.reaction) {
        params.error = e;
        await execReaction(onError.reaction);
      }
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
