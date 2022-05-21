import { Client, EmojiResolvable } from "discord.js";

export function report(...stuff: string[]) {
    console.log("[diy] =>", ...stuff);
}

export function handleEmoji(
    client: Client,
    emojiName?: EmojiResolvable
): EmojiResolvable | undefined {
    if (typeof emojiName !== "string") return emojiName;
    if (/\p{Emoji}/u.test(emojiName)) return emojiName;
    return client.emojis.cache.find((emoji) => emoji.name === emojiName);
}

export function pick(list: any[]) {
    return list[Math.floor(Math.random() * list.length)];
}

export function firstWord(content: string) {
    return content.split(" ")[0];
}

export function printNested(level: number, ...stuff: any[]) {
    let nesting = "";
    Array(level)
        .fill("\t")
        .forEach((x) => (nesting += x));
    const [first, ...rest] = stuff;
    console.log(`${nesting}\u001b[32m└> \u001b[0m${first}`, ...rest);
}
