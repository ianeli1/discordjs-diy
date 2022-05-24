import Config from "../../../corde.config";
import { Bot } from "../../";

export function createBot() {
  const bot = new Bot(Config.myToken!, {
    prefix: Config.botPrefix!,
    ignoreCaps: true,
  });

  return new Promise<Bot>((res) => void bot.client.on("ready", () => res(bot)));
}

