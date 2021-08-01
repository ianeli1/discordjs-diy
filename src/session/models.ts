import { User } from "discord.js";

export class SessionModel {
  readonly tag: string;
  readonly discordId: string;
  readonly name: string;
  readonly data: {
    [name: string]: string;
  } = {};

  constructor(user: User) {
    this.tag = user.tag;
    this.discordId = user.id;
    this.name = user.username;
  }
}
