import { Client } from "discord.js";
import { report } from "./utility";

export class BotBase {
  private token: string;

  /**Discord.js client object */
  readonly client: Client;

  constructor(token: string) {
    if (!token) throw new Error("No token was provided");
    this.token = token;
    this.client = new Client();
    this.client.login(this.token);
    this.client.on("ready", () => {
      report(
        `Bot created and logged in (${this.client.user?.tag ?? "NO TAG!!!"})`
      );
    });
  }
}
