# Discord.js - DIY

[![npm](https://img.shields.io/npm/v/discordjs-diy)]()

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

### Handling typos

Your users can be overwhelmed and confused by your bot's syntax. To aid them in the process, djs-diy offers a way to immediately point out which options they might have meant to type instead.

```ts
const bot = new Bot("<token>", { prefix: "!", embed });
bot.on("test", "hi there!");
bot.onTypo(
  ({ author }, [first, ...rest]) =>
    `Hey there, ${
      author.username
    }! Did you mean to type !${first}? Other options: ${rest.join(", ")}`
);
```

`Bot#onTypo` can set a callback for an scenario where an user types "tsst" or something similar as any other trigger.
Should be noted that onTypo is available router-wise and will always attempt to fetch a callback from any parent router (incluiding the Bot object's)

`onTypo` can take a second argument in the form of an object

```ts
{
  maxDistance: number;
  maxSuggestions: number;
}
```

`maxDistance`: Maximum [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) allowed
`maxSuggestions`: Max amount of suggestions to be provided to the callback

### Routing

Sometimes you may want a command to contain a subcommand. This is where routers come in. To use them, create a new Router object then assign commands to it. Finally assign it as an action in your main `Bot` object. Don't worry about the constructor parameters, they'll be filled in for you.

```ts
const bot = new Bot("<token>", { prefix: "!" });

const helpRouter = new Router();
helpRouter.on("info", "lorem ipsum");

bot.on("help", helpRouter);
//Bot will now respond to `!help info` with "lorem ipsum"
```

Routers have their own error handling too.

```ts
helpRouter.onError("Oh no!");
//if any of the commands under help router fail, "Oh no!" will be sent instead
```

Routers also have full support for slash commands.

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

The `Bot` object now provides a `Bot#commands.register` method. On its own, it'll register the commands globally (Read about the implications [here](https://discordjs.guide/interactions/registering-slash-commands.html#global-commands)). You can pass an array of strings if you only want to register the commands on certain guild IDs (for development, etc).

```ts
bot.on("debug_register", async ({ guild }) =>
  (await bot.commands.register(guild.id)) ? "Done" : "Something went wrong"
); //registers all the available slash commands , in the guild this message was sent in
```

Be sure to call this method _AFTER_ all of your commands and routers have been registered. For troubleshooting, `Bot#compileCommands` will return the objects that will then be passed to the Discord API (via `Bot#commands.overwriteCommands`)

DJS-diy will automatically create subcommands in the case of routers. Be mindful of the [nesting limitations](https://discord.com/developers/docs/interactions/application-commands#subcommands-and-subcommand-groups).

### Slash command timeout prevention

Routers (and the Bot object) support having a loading action be executed for any slash command interactions that may take longer than 2.5s to execute [(Discord's official timeout is 3s)](https://discord.com/developers/docs/interactions/receiving-and-responding#responding-to-an-interaction).

This action is a sendable message, meaning it can be a string or a function which receives ActionParameters. Do note that for performance reasons, this action can't be `async`

```ts
bot.onLoading(({ author }) => `I'm working on it, ${author.username}!`);
router1.onLoading("Hold tight!!!");
```

### Async Jobs

DJS-diy offers a small addon for running jobs _after_ a response has been issued.
You can enqueue these jobs by calling `asyncEffect` from the `ActionParameters` received by an action.
Should be noted that `msg` in the passed `ActionParameters` object will contain the newly created response.

```ts
bot.registerAction("image", async ({ createEmbed, asyncEffect }) => {
  asyncEffect(async ({ msg }) => {
    await msg.edit({
      content: "Hello there",
    });
  });

  return "This message will change";
});
```

### Triggering actions inside actions

ActionParameters include a `runAction` callback which can be used to manually invoke an action through the DJS pipeline, thus fully supporting `asyncEffect` and message component subscriptions.

You need a `ResponseAction` and `ActionParameters` to call this. You may reuse the action's `ActionParameters`, be aware that reusing `asyncEffect` or `subscribe`'s `ActionParameters` will have the side-effect of making it seem like the Bot is the one calling the action (ergo, making components unclickable to users)

```ts
//test action can include asyncEffect calls and components!
const testAction = () => "hello!";
bot.on("coolAction", (params) => {
  const { subscribe, createEmbed } = params;
  /* `runAction` is also available here! ^*/

  const buttonRow = subscribe(
    {
      label: "Press me",
      style: "PRIMARY",
    },
    ({ runAction }) => {
      runAction(testAction, params);
    }
  );
  return createEmbed({
    desc: "Press the button to be greeted",
    components: [buttonRow],
  });
});
```

### Error handling

DJS-diy offers per-action and global approaches to error handling.

To handle any exception using the same action:

```ts
bot.setErrorAction({
  reaction: "😭",
  response({ args }) {
    //args will contain the value of `e.message`
    return `Error ocurred => ${args}`;
  },
});
```

To handle an exception for a specific action, pass in an object and include the `onError` `ActionObject`:

```ts
bot.registerAction("hello", {
  response() {
    throw new Error("No hellos for you today");
  },
  onError: {
    reaction: "😭",
  },
});
```

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
