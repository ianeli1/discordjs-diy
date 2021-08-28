import {
  Client,
  CommandInteraction,
  EmojiResolvable,
  Interaction,
} from "discord.js";
import { SendableMessage } from "src";
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
    if (!msg.channel) {
      throw new Error(
        "A channel could not be found for this command execution"
      );
    }

    let reply: SendableMessage | undefined;
    if (typeof response === "string") reply = response;
    else if (typeof response === "function") reply = await response(params);
    if (msg instanceof CommandInteraction) {
      if (msg.replied) {
        reply && msg.editReply(await reply);
        return;
      }
      reply && msg.reply(await reply);
      return;
    }
    reply && (await msg.channel.send(await reply));
  }

  async function execReaction(reaction: ReactionAction) {
    if (msg instanceof Interaction) {
      report(
        `[ExecuteAction] => Ignoring react action as reactions are not supported for slash commands`
      );
      return;
    }
    let emoji: EmojiResolvable | undefined;
    if (typeof reaction === "string") emoji = handleEmoji(client, reaction);
    else if (typeof reaction === "function")
      emoji = handleEmoji(client, await reaction(params));
    emoji && (await msg.react(emoji));
  }

  const { reaction, response, onError } = action;
  const { msg, args, trigger, author } = params;

  let error: MessageError | undefined = undefined;
  report(
    `Command triggered, user: ${
      author.tag
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
        `An unhandled error ocurred while triggering an action response, trigger: ${trigger}\n`,
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
        `An unhandled error ocurred while triggering an action reaction, trigger: ${trigger}\n`,
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
