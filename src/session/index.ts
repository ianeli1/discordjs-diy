import type { ActionParameters, ParametersMiddleWare } from "../types";
import { report } from "./error";
import { SessionModel } from "./models";
import { MongoClient } from "mongodb";
import { Cache } from "./cache";

export interface SessionMW {
  session: {
    _id: string;
    tag: string;
    discordId: string;
    name: string;
    data: {
      [name: string]: string | number;
    };
    set(key: string, value: string): Promise<object>;
  };
}

export interface SessionConfig {
  /**MongoDB connection string */
  uri: string;

  /**Timeout for the internal cache in seconds, setting it to 0 disables the cache */
  cacheTimeout?: number;
  cacheLength?: number;
}

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

  return async (params) => {
    const { author, middleware = {} } = params;
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

    const set: SessionMW["session"]["set"] = async (key, value) => {
      const upd = await sessions.findOneAndUpdate({ discordId }, [
        {
          $addFields: {
            data: {
              [key]: value,
            },
          },
        },
      ]);

      return upd.value ? cache.set(key, upd.value) : {};
    };

    return {
      ...params,
      middleware: {
        ...middleware,
        session: {
          ...session,
          set,
        },
      },
    } as ActionParameters<SessionMW>;
  };
}
