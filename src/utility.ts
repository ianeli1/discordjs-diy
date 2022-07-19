import { Client, EmojiResolvable } from "discord.js";
//@ts-expect-error
import distance from "levenshtein-edit-distance"

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

export function sortByDistance(pattern: string, input: string[], weightLimit = 3): string[]{
    const trimmedPattern = pattern.trim()
    return input.map((value) => ({
        value,
        weight: distance(trimmedPattern, value, true /** ignore caps */)
    })).sort((a,b) => a.weight - b.weight).filter(x => x.weight < weightLimit).map(x => x.value)
}