# DiscordJS-diy Session Middleware

The session middleware offers a way to facilitate keeping track of users. It makes use of MongoDB to store its data.

```ts
import { Bot, Session, SessionMW } from "discordjs-diy";

async function main() {
  const bot = new Bot("<API KEY>", { prefix: "!" });
  bot.useMiddleware(
    //wait until a connection to the DB is established
    await Session({
      uri: "<connection string to MongoDB>",
    })
  );

  bot.registerAction("sessionInfo", ({ middleware }) => {
    const { session } = middleware! as SessionMW; //Using the correct TypeScript types

    /*
        session = {
            id: "<session id>",
            discordId: "<discord user id>",
            tag: "user#1234",
            name: "user",
            data: {}
        }
    */

    return JSON.stringify(session, null, 2);
  });
}

main();
```

## Using the data object

The following action with store a new entry in the session data object of the user. For example, `!save one 1` will assign `1` to the `one` property in the data object. This object will be available for all other actions.

```ts
bot.registerAction("save", async ({ middleware, args }) => {
  const [key, value] = args.split(" ");

  const { session } = middleware! as SessionMW;

  console.log(await session.set(key, value));

  return `${key} => ${value}`;
});
```
