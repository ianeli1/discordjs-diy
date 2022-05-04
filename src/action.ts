import {
  Client,
  CommandInteraction,
  EmojiResolvable,
  Interaction,
  Message,
} from "discord.js";
import { SendableMessage } from "./types";
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
        return !!reply && msg.editReply(await reply);
      }
      reply && (await msg.reply(await reply));
      return msg.fetchReply();
    }
    return !!reply && (await msg.channel.send(await reply));
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
  const { msg, args, trigger, author, __asyncJobs: asyncJobs } = params;

  let error: MessageError | undefined = undefined;
  report(
    `Command triggered, user: ${
      author.tag
    }, trigger: ${trigger}, args: ${args}, hasResponse: ${!!response}, hasReaction: ${!!reaction}`
  );

  if (response) {
    try {
      const responseMsg = await execResponse(response);
      if (responseMsg) {
        try {
          const newParams = { ...params, msg: responseMsg as Message };
          for (const asyncJob of asyncJobs) {
            await asyncJob.thenDo(newParams, await asyncJob.waitFor(newParams));
          }
        } catch (e) {
          report(
            `An error ocurred trying to execute async job. TriggerMsgId: ${msg.id}, ReplyMsgId: ${responseMsg.id}, e => ${e}`
          );
        }
      }
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
