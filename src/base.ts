import { Client, ClientOptions, Intents } from "discord.js";
import { report as _report } from "./utility";

let botCount = 0;

export class BotBase {
  protected token: string;
  id: number;

  /**Discord.js client object */
  readonly client: Client;

  constructor(token: string, intents?: ClientOptions["intents"]) {
    if (!token) throw new Error("No token was provided");
    this.id = botCount++;
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
      this.report(
        `Bot created and logged in => (${this.client.user?.tag ?? "NO TAG!!!"})`
      );
    });
  }

  report(...stuff: any[]) {
    _report(`[Bot(${this.id})] =>`, ...stuff);
  }
}
