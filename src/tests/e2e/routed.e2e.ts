import { beforeStart, group, expect, test } from "corde";
import { Bot, Router } from "../..";
import { createBot } from "./createBot";

let bot: Bot;
beforeStart(async () => {
  bot = await createBot();
  const router1 = new Router();
  bot.onError(({ args }) => `error: ${args}`);
  bot.on("1", router1);
  router1.onDefault("default");
  router1.on("2", ({ args = "<NO ARGS>" }) => args);
  router1.on("error", () => {
    throw new Error("error message");
  });
  router1.onError(({ args }) => `error: ${args}`);
}, 30000);

group("Standard routing", () => {
  test("executes the action", () => {
    expect("1 2").toReturn("<NO ARGS>");
  });

  test("extracts arguments", () => {
    expect("1 2 3").toReturn("3");
  });

  test("defaults to router value", () => {
    expect("1 4").toReturn("default");
  });

  test("handles exception", () => {
    expect("1 error").toReturn("error: error message");
  });
});

