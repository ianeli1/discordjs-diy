import { Bot } from "./bot";
import { Embed } from "./embed";

const bot = new Bot(
  "Nzk1MDk5MDg0MzIyMjQyNTkx.X_EbuQ.zBwkByZx1WRGXti59ps6DskKpcQ",
  { prefix: "!", ignoreCaps: true }
);
const embed = new Embed({ author: bot.client.user ?? undefined });

bot.registerAction("rin", {
  response: () => embed.create({ localImage: "rina.jpg" }),
  reaction: "🤓",
});
bot.registerAction("ping", "pong");
bot.setErrorAction({
  reaction: "😢",
  response: "me espiche",
});
