import { config } from "dotenv";

function cordeConfig() {
  config();

  const out = {
    cordeBotToken: process.env.TOKEN,
    myToken: process.env.MY_TOKEN,
    botTestId: process.env.BOT_ID,
    guildId: process.env.GUILD_ID,
    channelId: process.env.CHANNEL_ID,
    botPrefix: "!",
    testMatches: ["./**/*.e2e.ts"],
  } as const;

  for (const [key, val] of Object.entries(out)) {
    if (!val) {
      throw Error(`Missing env var ${key}`);
    }
  }

  return out;
}

const exp = cordeConfig();

export default exp;

module.exports = exp;
