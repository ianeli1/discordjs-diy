import { beforeStart, group, expect, test } from "corde";
import { Bot } from "../..";
import { createBot } from "./createBot";

let bot: Bot;
beforeStart(async () => {
  bot = await createBot();
  bot.on("ping", "pong");
});

group("Sanity test", () => {
  test("!ping => pong", () => {
    expect("ping").toReturn("pong");
  });

  test("!PiNg => pong", () => {
    expect("PiNg").toReturn("pong");
  });

  test("!hello => nothing", () => {
    expect("hello").not.toReturn("pong");
  });
});

