import Config from "../../../corde.config";
import { Bot } from "../../";

//due to the way djs-diy works (aka being mostly immutable) we can reuse
//the same object for performance
const bot = new Bot(Config.myToken!, {
  prefix: Config.botPrefix!,
  ignoreCaps: true,
});

export function createBot() {
  return new Promise<Bot>((res) => {
    if (bot.client.user) {
      return res(bot);
    }
    bot.client.on("ready", () => res(bot));
  });
}

