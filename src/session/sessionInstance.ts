import { Guild, User } from "discord.js";
import { Collection } from "mongodb";
import { SessionMW } from ".";
import { Cache } from "./cache";
import { SessionModel } from "./models";
import { ValidDataTypes } from "./types";

type S = SessionMW["session"];

export class SessionInstance implements S {
  tag: string;
  data: SessionModel["data"];
  discordId: string;
  name: string;
  constructor(
    public author: ConstructorParameters<typeof SessionModel>[0],
    sessionModel: SessionModel,
    private sessions: Collection<SessionModel>,
    private cache: Cache<SessionInstance>
  ) {
    this.tag = sessionModel.tag;
    this.data = sessionModel.data;
    this.discordId = sessionModel.discordId;
    this.name = sessionModel.name;
    this.set = this.set.bind(this);
    this.setForUser = this.setForUser.bind(this);
    this.getFromUser = this.getFromUser.bind(this);
    this.setForServer = this.setForServer.bind(this);
    this.getFromServer = this.getFromServer.bind(this);
    this.setGlobal = this.setGlobal.bind(this);
    this.getGlobal = this.getGlobal.bind(this);
  }

  async setForUser(user: User, key: string, value: ValidDataTypes) {
    const session = await SessionInstance.getSession(this.sessions, user);
    const instance = new SessionInstance(
      user,
      session,
      this.sessions,
      this.cache
    );
    return await instance.set(key, value);
  }

  getFromUser(user: User): Promise<SessionInstance>;
  getFromUser(user: User, key: string): Promise<ValidDataTypes | undefined>;
  async getFromUser(user: User, key?: ValidDataTypes) {
    const session = await SessionInstance.getSession(this.sessions, user);
    const instance = new SessionInstance(
      user,
      session,
      this.sessions,
      this.cache
    );
    if (key) {
      return instance.data[key] as ValidDataTypes | undefined;
    }
    return instance;
  }

  async setForServer(guild: Guild, key: string, value: ValidDataTypes) {
    const instance = await this.getFromServer(guild);
    return await instance.set(key, value);
  }

  getFromServer(guild: Guild, key: string): Promise<ValidDataTypes | undefined>;
  getFromServer(guild: Guild): Promise<SessionInstance>;
  async getFromServer(guild: Guild, key?: string) {
    const session = await SessionInstance.getSession(this.sessions, guild);
    const instance = new SessionInstance(
      guild,
      session,
      this.sessions,
      this.cache
    );
    if (key) {
      return instance.data[key] as ValidDataTypes | undefined;
    }
    return instance;
  }

  async setGlobal(key: string, value: ValidDataTypes) {
    const instance = await this.getGlobal();
    return await instance.set(key, value);
  }

  getGlobal(key: string): Promise<ValidDataTypes | undefined>;
  getGlobal(): Promise<SessionInstance>;
  async getGlobal(key?: string) {
    const session = await SessionInstance.getSession(this.sessions, "global");
    const instance = new SessionInstance(
      "global",
      session,
      this.sessions,
      this.cache
    );
    if (key) {
      return instance.data[key] as ValidDataTypes | undefined;
    }
    return instance;
  }

  static async getSession(
    sessions: Collection<SessionModel>,
    author: ConstructorParameters<typeof SessionModel>[0]
  ) {
    const id =
      author instanceof User
        ? author.id
        : author instanceof Guild
        ? `__server${author.id}`
        : "__global";
    let session: SessionModel | null = await sessions.findOne({
      discordId: id,
    });

    if (!session) {
      const newSession = new SessionModel(author);
      if ((await sessions.insertOne(newSession)).acknowledged) {
        session = newSession!;
      } else {
        const username =
          author instanceof User
            ? author.username
            : author instanceof Guild
            ? author.name
            : author;
        throw new Error(
          `[SessionMW] => Unable to create Session entry for ${username} id: ${id}`
        );
      }
    }

    return session;
  }

  async set(key: string, value: string): Promise<SessionInstance> {
    const upd = await this.sessions.findOneAndUpdate(
      { discordId: this.discordId },
      [
        {
          $addFields: {
            data: {
              [key]: value,
            },
          },
        },
      ]
    );

    if (!upd.value) {
      if (!this.author) {
        throw new Error(
          `An error ocurred for user ${this.discordId} while setting "${key}" to "${value}"`
        );
      }

      const newSession = new SessionModel(this.author);

      newSession.data[key] = value;
      this.data[key] = value;

      if ((await this.sessions.insertOne(newSession)).acknowledged) {
        return this.cache.set(this.discordId, this);
      }

      throw new Error(
        `An error ocurred for user ${this.discordId} while setting "${key}" to "${value}"`
      );
    }
    return this.cache.set(this.discordId, this);
  }
}
