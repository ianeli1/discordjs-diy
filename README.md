# Discord.js - DIY

Easy to use, do-it-yourself Discord.js mini-framework

You can find [the full reference wiki here.](https://ianeli1.github.io/discordjs-diy/)

### What can I use it for

Making Discord.JS bots when you're in a run. You can get started with only 2 lines! (incluiding the import)!

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
  ({ args }) =>
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
  response: async ({ msg }) => await waitForResponse(msg.author),
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

### Using embeds

Discordjs-diy tries to make using embeds a little easier. You first need to create an `Embed` object

```ts
import { Embed } from "discordjs-diy";

const embed = new Embed({
  //you can customize the Embed here, all parameters are optional
  color: "#0000FF", //blue
});
```

To use your embeds in your bot you can pass the object to your bot's object

```ts
const embed = new Embed({});
const bot = new Bot("<token>", { prefix: "!", embed });
bot.registerAction("test", ({ args, createEmbed }) =>
  createEmbed({ desc: args })
);
//!test hello => embed containing hello as a description
```

Bots will usually use a collection of images to represent emotions, you can use them easily with the `embed.registerImage` method

```ts
const embed = new Embed({});
const bot = new Bot("<token>", { prefix: "!", embed });
embed.registerImage("happy", "<url to image>");
bot.registerAction("test", ({ args, createEmbed }) =>
  createEmbed({ desc: args, sideImage: "happy" })
);
//!test hello => embed containing hello as a description and the image "test"
```

In case your bot requires it, you can set a custom format for the embed description and the footer

```ts
const embed = new Embed({
  descTransform: (desc: string) => `${desc}, hello!`, //hello => hello, hello!
  refTransform: (user: User) => [
    `User: ${user.username}`,
    user.avatarURL() ?? undefined,
  ],
});
const bot = new Bot("<token>", { prefix: "!", embed });
bot.registerAction("test", ({ msg, args, createEmbed }) =>
  createEmbed({ desc: args, reference: msg.author })
);
//!test hello => embed containing "hello, hello!" as a description and the footer containing "User: <name>"
```

Also your embeds can contain the avatar and name of the bot

```ts
const embed = new Embed({
  author: bot.user,
});
const bot = new Bot("<token>", { prefix: "!", embed });
bot.registerAction("test", ({ args, createEmbed }) =>
  createEmbed({ desc: args })
);
```

### Expecting replies

You can easily do a 2 part command, expecting a reply from the same user

For example, a simple conversation could go like

```ts
(user) => "!wakeMeUp";
(bot) => "When should I wake you up?";
(user) => "When September ends";
(bot) => "Ok, I'll wake you up When September ends";
```

This can be easily achieved with the `expectReply` method the action toolkit provides

```ts
bot.registerAction("wakeMeUp", async ({ expectReply }) => {
  //built in Promise handling!
  const reply = await expectReply("When should I wake you up?", true); //You can choose if the bot should delete this message or not by setting the second parameter
  return `Ok, I'll wake you up ${reply?.content}`;
});
```

The `expectReply()` promise will resolve to `undefined` if there's a timeout

### Automatic Slash Command Support

Discordjs-DIY comes with integrated slash command generation. When you execute the `.registerAction` method, the library automatically generates a slash command JSON to be sent to the API.

The default is a command with no parameters and a description of "A command"

To specify parameters manually, add a `parameters` property or a third parameter to `.registerAction`.

Example parameters array:

```ts
[
  {
    name: "key",
    type: "STRING" /*optional, defaults to STRING*/,
    description: "Hello" /*optional, defaults to "A command"*/,
  },
  { name: "value" },
];
```

The `Bot` object now provides a `.registerSlashCommands` method. On its own, it'll register the commands globally (Read about the implications [here](https://discordjs.guide/interactions/registering-slash-commands.html#global-commands)). You can pass an array of strings if you only want to register the commands on certain guilds (for development, etc).

### Middleware

Discordjs-diy provides support for custom middleware.

```ts
interface MyCustomMW{
  myMW: {
    currentTime: number
  }
}

const bot = new Bot("<token>", { prefix: "!", embed });
function myMiddleware(params: ActionParameters): ActionParameters<MyCustomMW>{
  return {
    ...params,
    middleware: {
      ...params.middleware,
      myMW: {
        currentTime: Date.now()
      }
    }
  }
}
bot.useMiddleware<MyCustomMW>(myMiddleware)
bot.registerAction(({middleware}) => //now you can use middleware.myMW in every action execution)
```

### Session Middleware

Discordjs-diy provides a solution for sessions.

[Documentation is available here.](Session.md)
