import { Message } from "discord.js";
import { APIMessage } from "discord.js/node_modules/discord-api-types";
import { Bot } from "./bot";
import { RoutedAction } from "./routedAction";
import { Router } from "./router";
import {
  ActionObject,
  ActionParameters,
  ReactionAction,
  ResponseAction,
} from "./types";

/**
 * Represents a singular action to be executed
 */
export abstract class IAction {
  bot: Bot;
  id: string;
  router: Router;
  constructor(
    public params: ActionParameters,
    public action: RoutedAction,
    _invokerId: string | undefined
  ) {}

  abstract report(..._stuff: string[]): void;

  abstract hasError(): boolean;

  abstract getError(
    newParams: Partial<ActionParameters>
  ): Generator<IAction | undefined>;

  abstract execResponse(
    response?: ResponseAction
  ): Promise<Message | APIMessage | undefined>;

  abstract execReaction(reaction?: ReactionAction): Promise<void>;

  abstract executeAll(action?: ActionObject): Promise<void>;
}
