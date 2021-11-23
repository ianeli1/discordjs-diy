import { Guild, User } from "discord.js";

export class SessionModel {
  readonly tag: string;
  readonly discordId: string;
  readonly name: string;
  readonly data: {
    [name: string]: string;
  } = {};

  constructor(user: User | Guild | "global") {
    if (user instanceof User) {
      this.tag = user.tag;
      this.discordId = user.id;
      this.name = user.username;
    } else if (user instanceof Guild) {
      this.tag = "NO TAG";
      this.discordId = `__server${user.id}`;
      this.name = user.name;
    } else {
      this.tag = "GLOBAL";
      this.discordId = "__global";
      this.name = "GLOBAL";
    }
  }
}
