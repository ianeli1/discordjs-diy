import { Bot } from "../bot";
import { ActivityType, Client, Message } from "discord.js";
import { ActionObject } from "../types";
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

describe("registerAction method", () => {
  const bot = new Bot("test", { prefix: "!" });

  test("passing only a function", () => {
    const response = () => "hello";
    const triggerName = "test";
    expect(bot.registerAction(triggerName, response)).toBe(triggerName);
  });

  test("passing a whole function", () => {
    const action: ActionObject = {
      reaction: jest.fn().mockReturnValue("e"),
      response: jest.fn().mockReturnValue("hello"),
    };
    const triggerName = "test";
    expect(bot.registerAction(triggerName, action)).toBe(triggerName);
  });

  test("using a regex as a trigger", () => {
    const trigger = /hello/i;
    const action: ActionObject = {
      response: "hello",
    };
    expect(() => bot.registerAction(trigger, action)).not.toThrowError();
  });
});

describe("removeAction method", () => {
  const bot = new Bot("test", { prefix: "!" });
  const response = () => "hello";
  const triggerName = "test";
  bot.registerAction(triggerName, response);

  test("check response exists and remove it", () => {
    expect(bot.removeAction(triggerName)).toBe(triggerName);
  });

  test("return undefined if doesn't exist", () => {
    expect(bot.removeAction("what1231231")).toBe(undefined);
  });

  test("remove regex action", () => {
    const trigger = /test/;
    bot.registerAction(trigger, "test");
    expect(bot.removeAction(trigger)).toBe(trigger);
  });

  test("don't do anything if doesn't exist, regex", () => {
    expect(bot.removeAction(/hi/)).toBe(undefined);
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
    const fakeMessage = {
      content: "wrong",
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown as Message;
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
    const fakeMessage = {
      content: "!wrong",
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown as Message;
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
    const fakeMessage = {
      content: `!${triggerName}`,
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown as Message;
    await manTrigger(fakeMessage);
    expect(fakeMessage.channel.send).toHaveBeenCalled();
    expect(fakeMessage.react).toHaveBeenCalled();
    expect(action.reaction).toHaveBeenCalled();
    expect(action.response).toHaveBeenCalled();
    done();
  });

  test("triggers and does what's needed, regex", async (done) => {
    const triggerName = "test3";
    const action = {
      response: jest.fn().mockReturnValue(triggerName),
      reaction: jest.fn().mockReturnValue("🤓"),
    };
    bot.registerAction(/test3/, action);
    const fakeMessage = {
      content: `!${triggerName}`,
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown as Message;
    await manTrigger(fakeMessage);
    expect(fakeMessage.channel.send).toHaveBeenCalled();
    expect(fakeMessage.react).toHaveBeenCalled();
    expect(action.reaction).toHaveBeenCalled();
    expect(action.response).toHaveBeenCalled();
    done();
  });

  test("triggers and does what's needed, array", async (done) => {
    const action = {
      response: jest.fn().mockReturnValue("triggerName"),
      reaction: jest.fn().mockReturnValue("🤓"),
    };
    const triggers = ["testtest", "te"];
    bot.registerAction(triggers, action);
    const fakeMessage = {
      author: {
        tag: "cooltag",
      },
      react: jest.fn(),
      channel: {
        send: jest.fn(),
      },
    } as unknown as Message;
    await Promise.all(
      triggers.map((x) =>
        manTrigger({ ...fakeMessage, content: `!${x}` } as Message)
      )
    );
    expect(fakeMessage.channel.send).toHaveBeenCalledTimes(2);
    expect(fakeMessage.react).toHaveBeenCalledTimes(2);
    expect(action.reaction).toHaveBeenCalledTimes(2);
    expect(action.response).toHaveBeenCalledTimes(2);
    done();
  });
});

describe("setPresence method", () => {
  beforeAll(() => {
    bot = new Bot("test", { prefix: "!" });
    bot.client.user = {
      setActivity: jest.fn(),
    } as unknown as typeof Client.prototype.user;
    bot.client.user!.setActivity = jest.fn();
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
    expect(bot.client.user?.setActivity).toHaveBeenCalled();
  });

  test("throws error if list empty", () => {
    expect(() => bot.setPresence([])).toThrowError();
  });
});
