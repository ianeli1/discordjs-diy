import { Guild, User } from "discord.js";
import { SessionModel } from "./models";

export type ValidDataTypes = SessionModel["data"][""];

export interface ProtoSession {
  tag: string;
  discordId: string;
  name: string;
  data: Record<string, ValidDataTypes>;
}

export interface SessionMW {
  session: ProtoSession & {
    set(key: string, value: string): Promise<SessionMW["session"]>;

    setForUser(
      user: User,
      key: string,
      value: ValidDataTypes
    ): Promise<SessionMW["session"] | undefined>;

    getFromUser(user: User): Promise<SessionMW["session"]>;
    getFromUser(user: User, key: string): Promise<ValidDataTypes | undefined>;

    setForServer(
      guild: Guild,
      key: string,
      value: ValidDataTypes
    ): Promise<SessionMW["session"]>;
    getFromServer(
      guild: Guild,
      key: string
    ): Promise<ValidDataTypes | undefined>;
    getFromServer(guild: Guild): Promise<SessionMW["session"] | undefined>;

    setGlobal(
      key: string,
      value: ValidDataTypes
    ): Promise<SessionMW["session"]>;
    getGlobal(key: string): Promise<ValidDataTypes | undefined>;
    getGlobal(): Promise<SessionMW["session"]>;
  };
}

export interface SessionConfig {
  /**MongoDB connection string */
  uri: string;

  /**Timeout for the internal cache in seconds, setting it to 0 disables the cache */
  cacheTimeout?: number;
  cacheLength?: number;
}
