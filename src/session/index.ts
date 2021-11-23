import type { ActionParameters, ParametersMiddleWare } from "../types";
import { report } from "./error";
import { SessionModel } from "./models";
import { MongoClient } from "mongodb";
import { Cache } from "./cache";
import { ProtoSession, SessionConfig, SessionMW } from "./types";
import { Guild, User } from "discord.js";

export { SessionMW, SessionConfig };
//todo cachegoose

export async function Session({
  uri,
  cacheTimeout = 30,
  cacheLength = 50,
}: SessionConfig): Promise<ParametersMiddleWare<SessionMW>> {
  const client = new MongoClient(uri);

  client.on("error", (error) => report("[MongoDB] =>", error));

  try {
    await client.connect();
  } catch (e) {
    report("[MongoDB] =>", e);
  }

  const cache = new Cache<SessionModel>({
    length: cacheLength,
    timeout: cacheTimeout,
  });

  const db = client.db("discordJsSession");
  const sessions = db.collection<SessionModel>("sessions");

  const setForDiscordId = async (
    user: User | Guild | "global" | undefined,
    discordId: string,
    key: string,
    value: string
  ) => {
    const upd = await sessions.findOneAndUpdate({ discordId }, [
      {
        $addFields: {
          data: {
            [key]: value,
          },
        },
      },
    ]);

    if (!upd.value) {
      if (!user) {
        throw new Error(
          `An error ocurred for user ${discordId} while setting "${key}" to "${value}"`
        );
      }

      const newSession = new SessionModel(user);

      newSession.data[key] = value;

      if ((await sessions.insertOne(newSession)).acknowledged) {
        return cache.set(discordId, newSession);
      }

      throw new Error(
        `An error ocurred for user ${discordId} while setting "${key}" to "${value}"`
      );
    }
    return cache.set(discordId, upd.value) as ProtoSession;
  };

  const getFromDiscordId = async (
    user: User | Guild | "global" | undefined,
    discordId: string,
    key?: string
  ) => {
    let data = cache.get(discordId) ?? (await sessions.findOne({ discordId }));
    if (!data) {
      if (!user) {
        throw new Error(
          `An error ocurred for user ${discordId} while getting "${key}"`
        );
      }
      const newSession = new SessionModel(user);

      await sessions.insertOne(newSession);

      data = newSession;
    }
    if (key !== undefined) {
      return data.data[key] as string;
    }
    return data;
  };

  return async (params) => {
    const { author, middleware = {}, guild } = params;
    const discordId = author.id;

    let session =
      cache.get(discordId) ?? (await sessions.findOne({ discordId }));

    if (!session) {
      const newSession = new SessionModel(author);
      if ((await sessions.insertOne(newSession)).acknowledged) {
        session = newSession!;
      }
    }

    if (!cache.has(discordId) && session) {
      cache.set(discordId, session);
    }

    return {
      ...params,
      middleware: {
        ...middleware,
        session: {
          ...session,
          set: (key, value) => setForDiscordId(author, discordId, key, value),
          getFromUser: (discordId, key) =>
            getFromDiscordId(undefined, discordId, key),
          setForUser: (discordId, key, value) =>
            setForDiscordId(undefined, discordId, key, value),
          setForServer: (key, value) =>
            guild?.id &&
            setForDiscordId(guild, `__server${guild.id}`, key, value),
          getFromServer: (key) =>
            guild?.id && getFromDiscordId(guild, `__server${guild.id}`, key),
          setGlobal: (key, value) =>
            setForDiscordId("global", "__global", key, value),
          getGlobal: (key) => getFromDiscordId("global", "__global", key),
        },
      },
    } as ActionParameters<SessionMW>;
  };
}
