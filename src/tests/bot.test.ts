import { Bot } from "../bot";
import { ActivityType, Client, Message } from "discord.js";
import { Action } from "../types";
jest.mock("discord.js");
jest.unmock("../action");

describe("bot constructor", () => {
  test("fails if you don't provide at least a suffix or a prefix", () => {
    expect(() => void new Bot("someToken", {})).toThrowError();
  });

  test("binds itself to the message event", () => {
    new Bot("idk", { prefix: "!" });
    expect(Client.prototype.on).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });
});

describe("setDefaultAction method", () => {
  const bot = new Bot("test", { prefix: "!" });

  test("passing only a function", () => {
    const response = () => "hello";
    bot.setDefaultAction(response);
    expect(bot.defaultAction.response).toBe(response);
  });

  test("passing a whole action", () => {
    const action: Omit<Action, "trigger"> = {
      reaction: jest.fn().mockReturnValue("e"),
      response: jest.fn().mockReturnValue("hello"),
    };
    bot.setDefaultAction(action);
    expect(bot.defaultAction.response).toBe(action.response);
    expect(bot.defaultAction.reaction).toBe(action.reaction);
  });
});

describe("registerAction method", () => {
  const bot = new Bot("test", { prefix: "!" });

  test("passing only a function", () => {
    const response = () => "hello";
    const triggerName = "test";
    expect(bot.registerAction(triggerName, response)).toBe(triggerName);
    expect(bot.messageActions[triggerName].response).toBe(response);
  });

  test("passing a whole function", () => {
    const action: Omit<Action, "trigger"> = {
      reaction: jest.fn().mockReturnValue("e"),
      response: jest.fn().mockReturnValue("hello"),
    };
    const triggerName = "test";
    expect(bot.registerAction(triggerName, action)).toBe(triggerName);
    expect(bot.messageActions[triggerName].response).toBe(action.response);
    expect(bot.messageActions[triggerName].reaction).toBe(action.reaction);
  });
});

describe("removeAction method", () => {
  const bot = new Bot("test", { prefix: "!" });
  const response = () => "hello";
  const triggerName = "test";
  bot.registerAction(triggerName, response);

  test("check response exists and remove it", () => {
    expect(bot.messageActions[triggerName].response).toBe(response);
    expect(bot.removeAction(triggerName)).toBe(triggerName);
    expect(bot.messageActions).not.toHaveProperty(triggerName);
  });

  test("return null if doesn't exist", () => {
    expect(bot.removeAction("what")).toBe(null);
  });
});

let manTrigger: (msg: Message) => Promise<void>;
let bot: Bot;

describe("messageHandler method", () => {
  beforeAll(() => {
    Client.prototype.on = jest
      .fn()
      .mockImplementation((_, fn: typeof manTrigger) => {
        manTrigger = fn;
      });
    bot = new Bot("idk", { prefix: "!", ignoreCaps: true });
  });

  test("doesn't trigger if prefix isn't valid", async (done) => {
    const triggerName = "test";
    const response = jest.fn().mockReturnValue(triggerName);
    bot.registerAction(triggerName, response);
    const fakeMessage = ({
      content: "wrong",
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown) as Message;
    await manTrigger(fakeMessage);
    expect(fakeMessage.channel.send).not.toHaveBeenCalled();
    expect(fakeMessage.react).not.toHaveBeenCalled();
    expect(response).not.toHaveBeenCalled();
    done();
  });

  test("doesn't trigger if trigger isn't valid", async (done) => {
    const triggerName = "test1";
    const response = jest.fn().mockReturnValue(triggerName);
    bot.registerAction(triggerName, response);
    const fakeMessage = ({
      content: "!wrong",
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown) as Message;
    await manTrigger(fakeMessage);
    expect(fakeMessage.channel.send).not.toHaveBeenCalled();
    expect(fakeMessage.react).not.toHaveBeenCalled();
    expect(response).not.toHaveBeenCalled();
    done();
  });

  test("triggers and does what's needed", async (done) => {
    const triggerName = "test2";
    const action = {
      response: jest.fn().mockReturnValue(triggerName),
      reaction: jest.fn().mockReturnValue("🤓"),
    };
    bot.registerAction(triggerName, action);
    const fakeMessage = ({
      content: `!${triggerName}`,
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown) as Message;
    await manTrigger(fakeMessage);
    expect(fakeMessage.channel.send).toHaveBeenCalled();
    expect(fakeMessage.react).toHaveBeenCalled();
    expect(action.reaction).toHaveBeenCalled();
    expect(action.response).toHaveBeenCalled();
    done();
  });
});

describe("setPresence method", () => {
  beforeAll(() => {
    bot = new Bot("test", { prefix: "!" });
    bot.client.user = ({
      setActivity: jest.fn(),
    } as unknown) as typeof Client.prototype.user;
    bot.client.clearInterval = jest.fn();
    bot.client.setInterval = jest.fn().mockReturnValue({} as NodeJS.Timeout);
  });

  test("setting a single status", () => {
    const presence = ["game", "PLAYING"] as [string, ActivityType];
    bot.setPresence(presence);
    expect(bot.client.user!.setActivity).toHaveBeenCalledWith(presence[0], {
      type: presence[1],
    });
  });

  test("setting multiple statuses", () => {
    const presences = [
      ["1", "PLAYING"],
      ["2", "PLAYING"],
    ] as [string, ActivityType][];
    bot.setPresence(presences);
    expect(bot.client.clearInterval).toHaveBeenCalled();
    expect(bot.client.setInterval).toHaveBeenCalled();
  });

  test("throws error if list empty", () => {
    expect(() => bot.setPresence([])).toThrowError();
  });
});
