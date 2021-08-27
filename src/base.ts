import { Client, ClientOptions, Intents } from "discord.js";
import { report } from "./utility";

export class BotBase {
  private token: string;

  /**Discord.js client object */
  readonly client: Client;

  constructor(token: string, intents?: ClientOptions["intents"]) {
    if (!token) throw new Error("No token was provided");
    this.token = token;
    this.client = new Client({
      intents: intents ?? [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    });
    this.client.login(this.token);
    this.client.once("ready", () => {
      report(
        `Bot created and logged in (${this.client.user?.tag ?? "NO TAG!!!"})`
      );
    });
  }
}
