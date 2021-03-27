import { Client, EmojiResolvable } from "discord.js";

export function report(...stuff: string[]) {
  console.log("[discord.js-diy] => ", ...stuff);
}

export function handleEmoji(
  client: Client,
  emojiName: EmojiResolvable
): EmojiResolvable | undefined {
  if (typeof emojiName !== "string") return emojiName;
  if (/\p{Emoji}/u.test(emojiName)) return emojiName;
  return client.emojis.cache.find((emoji) => emoji.name === emojiName);
}

export function pick(list: any[]) {
  return list[Math.floor(Math.random() * list.length)];
}
