import { CommandsHandler } from "../handler";
import { ActionObject } from "../types";

let embed: CommandsHandler;
const def = {
  response: "default",
};

describe("using string trigger", () => {
  beforeAll(() => {
    embed = new CommandsHandler();
    embed.setDefaultAction(def);
  });

  test("adds and returns the action", () => {
    const action: ActionObject = {
      response: "",
    };
    const key = "hello";

    embed.setAction(key, action);
    expect(embed.findAction(key)).toBe(action);
  });

  test("adds and doesn't return the action if deleted", () => {
    const action: ActionObject = {
      response: "",
    };
    const key = "hello2";

    embed.setAction(key, action);
    embed.removeAction(key);
    expect(embed.findAction(key)).toBe(def);
  });
});

describe("using regex trigger", () => {
  beforeAll(() => {
    embed = new CommandsHandler();
    embed.setDefaultAction(def);
  });

  test("adds and returns the action", () => {
    const action: ActionObject = {
      response: "",
    };
    const key = "coolKey";

    embed.setAction(/coolKey/, action);
    expect(embed.findAction(key)).toBe(action);
  });

  test("adds and doesn't return the action if deleted", () => {
    const action: ActionObject = {
      response: "2",
    };
    const key = "hello2";

    embed.setAction(new RegExp(key), action);
    embed.removeAction(new RegExp(key));
    expect(embed.findAction(key)).toBe(def);
  });
});
