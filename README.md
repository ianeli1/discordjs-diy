# Discord.js - DIY

Easy to use, do-it-yourself Discord.js mini-framework

## What can I use it for

Simple Discord bots without much complex logic

All you need to get started is install it using `npm install discordjs-diy` and import it into your project.

```ts
import { Bot } from "discordjs-diy";

const bot = new Bot("<your Discord API token>", { prefix: "!" });
bot.registerAction("ping", "pong"); //!ping => pong
```
