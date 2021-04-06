import type { Client, EmojiResolvable } from "discord.js";
import { handleEmoji, pick, report } from "../utility";

test("report prints to the screen", () => {
  console.log = jest.fn();
  report("hello");
  expect(console.log as jest.Mock).toHaveBeenCalledWith(
    "[discord.js-diy] =>",
    "hello"
  );
});

test("pick should choose at random", () => {
  const k = [1, 2, 3];
  expect(pick(k)).toBeLessThanOrEqual(3);
});

test("handle emoji should return the same if it's an emoji", () => {
  expect(handleEmoji(({} as unknown) as Client, "🤓")).toBe("🤓");
});

test("fetch emojiresolvable if it's not an emoji", () => {
  const fakeClient = ({ emojis: { cache: {} } } as unknown) as Client;
  fakeClient.emojis.cache.find = jest.fn();
  handleEmoji(fakeClient, "emojiname");
  expect(fakeClient.emojis.cache.find).toHaveBeenCalled();
});

test("return emojiresolvable if it's not a string", () => {
  expect(
    handleEmoji(({} as unknown) as Client, ({} as unknown) as EmojiResolvable)
  );
});
