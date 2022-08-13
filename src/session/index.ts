import type { BarebonesActionParameters, ParametersMiddleWare } from "../types";
import { report } from "./error";
import { SessionModel } from "./models";
import { MongoClient } from "mongodb";
import { Cache } from "./cache";
import { SessionConfig, SessionMW } from "./types";
import { SessionInstance } from "./sessionInstance";

export { SessionMW, SessionConfig };
//todo cachegoose

export async function Session({
  uri,
  cacheTimeout = 30,
  cacheLength = 50,
}: SessionConfig): Promise<ParametersMiddleWare> {
  const client = new MongoClient(uri);

  client.on("error", (error) => report("[MongoDB] =>", error));

  try {
    await client.connect();
  } catch (e) {
    report("[MongoDB] =>", e);
  }

  const cache = new Cache<SessionInstance>({
    length: cacheLength,
    timeout: cacheTimeout,
  });

  const db = client.db("discordJsSession");
  const sessions = db.collection<SessionModel>("sessions");

  return async (params) => {
    const { author, middleware = {} } = params;
    const discordId = author.id;

    const session = await SessionInstance.getSession(sessions, author);

    const sessionObj = new SessionInstance(author, session!, sessions, cache);

    if (!cache.has(discordId) && session) {
      cache.set(discordId, sessionObj);
    }

    return {
      ...params,
      middleware: {
        ...middleware,
        session: sessionObj,
      },
    } as BarebonesActionParameters;
  };
}
