# Discord.js - DIY

Easy to use, do-it-yourself Discord.js mini-framework

### What can I use it for

Simple Discord bots without much complex logic

### How do I use it

All you need to get started is install it using `npm install discordjs-diy` and import it into your project.

```ts
import { Bot } from "discordjs-diy";

const bot = new Bot("<your Discord API token>", { prefix: "!" });
bot.registerAction("ping", "pong"); //!ping => pong
```

### What if I want my bot to do cool stuff?

```ts
import { Bot } from "discordjs-diy";
const bot = new Bot("<your Discord API token>", { prefix: "?" });
bot.registerAction(
  "rate",
  (_, args) =>
    `You want me to rate ${args}? Ok... ${Math.floor(Math.random() * 10)}/10`
); //?rate something => The bot replies!
```

```ts
import { Bot } from "discordjs-diy";
const bot = new Bot("<your Discord API token>", { prefix: "*" });
bot.registerAction("reactAndReply", {
  response: "Hello!",
  reaction: () => "🤓",
}); //*reactAndReply => The bot can also react to messages and reply!
```

```ts
import { Bot } from "discordjs-diy";
const bot = new Bot("<your Discord API token>", { prefix: "*", ignoreCaps });
bot.registerAction("await", {
  response: async (msg) => await waitForResponse(msg.author),
}); //*AWAIT => bot can ignore caps and use async/await!
```

### Updating Discord presence

The bot can also easily update presence information

```ts
const bot = new Bot("<you know the deal>", { prefix: "!" });
bot.setPresence(["a game", "PLAYING"]);
//or, in case you want it to change every 10 minutes
bot.setPresence([
  ["a game", "PLAYING"],
  ["a movie", "WATCHING"],
]);
//you can also set your own time (in ms)
bot.setPresence(
  [
    ["a game", "PLAYING"],
    ["a movie", "WATCHING"],
  ],
  5 * 60 * 1000
);
```

### What if I want to do my own thing

You can always access the normal client object from Discord.JS

```ts
const bot = new Bot("<you know the deal>", { prefix: "!" });
bot.client.on("<some action>", () => "<do something>");
```
