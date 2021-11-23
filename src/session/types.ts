import { SessionModel } from "./models";

export type ValidDataTypes = SessionModel["data"][""];

export interface ProtoSession {
  _id: string;
  tag: string;
  discordId: string;
  name: string;
  data: Record<string, ValidDataTypes>;
}

export interface SessionMW {
  session: ProtoSession & {
    set(key: string, value: string): Promise<ProtoSession>;

    setForUser(
      discordId: string,
      key: string,
      value: ValidDataTypes
    ): Promise<ProtoSession>;

    getFromUser(discordId: string): Promise<ProtoSession>;
    getFromUser(discordId: string, key: string): Promise<ValidDataTypes>;

    setForServer(
      key: string,
      value: ValidDataTypes
    ): Promise<ProtoSession | undefined>;
    getFromServer(key: string): Promise<ValidDataTypes | undefined>;
    getFromServer(): Promise<ProtoSession | undefined>;

    setGlobal(key: string, value: ValidDataTypes): Promise<ProtoSession>;
    getGlobal(key: string): Promise<ValidDataTypes>;
    getGlobal(): Promise<ProtoSession>;
  };
}

export interface SessionConfig {
  /**MongoDB connection string */
  uri: string;

  /**Timeout for the internal cache in seconds, setting it to 0 disables the cache */
  cacheTimeout?: number;
  cacheLength?: number;
}
