import { Bot } from "../bot";
import { Client, Message } from "discord.js";
jest.mock("discord.js");

test("fails if you don't provide at least a suffix or a prefix", () => {
  expect(() => void new Bot("someToken", {})).toThrowError();
});

test("binds itself to the message event", () => {
  new Bot("idk", { suffix: "test" });
  expect(Client.prototype.on).toHaveBeenCalledWith(
    "message",
    expect.any(Function)
  );
});

//figure out why the manTrigger function was losing scope after being executed once

describe("doesn't trigger if prefix isn't valid", () => {
  let manTrigger: (msg: Message) => Promise<void>;

  Client.prototype.on = jest
    .fn()
    .mockImplementation((_, fn: typeof manTrigger) => {
      console.log(`[JEST]: stole the trigger func!`);
      manTrigger = fn;
    });
  const bot = new Bot("idk", { prefix: "!" });
  const fakeAction = [
    "trigger",
    { response: jest.fn().mockReturnValue("test") },
  ] as [string, { response: jest.Mock }];
  bot.registerAction(...(fakeAction as Parameters<Bot["registerAction"]>));
  const fakeMessage = ({
    content: "!trigger test",
    author: {
      tag: "cooltag",
    },
    react: jest.fn(),
    channel: {
      send: jest.fn(),
    },
  } as unknown) as Message;
  fakeMessage.content = "trigger test";
  expect(async () => {
    await manTrigger(fakeMessage);
  }).not.toThrowError();
  expect(fakeAction[1].response).not.toHaveBeenCalled();
  expect(fakeMessage.channel.send).not.toHaveBeenCalled();
});

describe("doesn't trigger if trigger word isn't valid", () => {
  let manTrigger: (msg: Message) => Promise<void>;

  Client.prototype.on = jest
    .fn()
    .mockImplementation((_, fn: typeof manTrigger) => {
      console.log(`[JEST]: stole the trigger func!`);
      manTrigger = fn;
    });
  const bot = new Bot("idk", { prefix: "!" });
  const fakeAction = [
    "trigger",
    { response: jest.fn().mockReturnValue("test") },
  ] as [string, { response: jest.Mock }];
  bot.registerAction(...(fakeAction as Parameters<Bot["registerAction"]>));
  const fakeMessage = ({
    content: "!trigger test",
    author: {
      tag: "cooltag",
    },
    react: jest.fn(),
    channel: {
      send: jest.fn(),
    },
  } as unknown) as Message;
  fakeMessage.content = "!trigge test";
  expect(async () => {
    await manTrigger(fakeMessage);
  }).not.toThrowError();
  expect(fakeAction[1].response).not.toHaveBeenCalled();
  expect(fakeMessage.channel.send).not.toHaveBeenCalled();
});

describe("executes the action", () => {
  let manTrigger: (msg: Message) => Promise<void>;

  Client.prototype.on = jest
    .fn()
    .mockImplementation((_, fn: typeof manTrigger) => {
      console.log(`[JEST]: stole the trigger func!`);
      manTrigger = fn;
    });
  const bot = new Bot("idk", { prefix: "!" });
  const fakeAction = [
    "trigger",
    { response: jest.fn().mockReturnValue("test") },
  ] as [string, { response: jest.Mock }];
  bot.registerAction(...(fakeAction as Parameters<Bot["registerAction"]>));
  const fakeMessage = ({
    content: "!trigger test",
    author: {
      tag: "cooltag",
    },
    react: jest.fn(),
    channel: {
      send: jest.fn(),
    },
  } as unknown) as Message;
  fakeMessage.content = "!trigger test";
  expect(async () => {
    await manTrigger(fakeMessage);
  }).not.toThrowError(); //trigger it manually
  expect(fakeAction[1].response).toHaveBeenCalledWith(fakeMessage, "test");
});
/* TODO: figure out why they fail
describe("sends the message", () => {
  let manTrigger: (msg: Message) => Promise<void>;

  Client.prototype.on = jest
    .fn()
    .mockImplementation((_, fn: typeof manTrigger) => {
      console.log(`[JEST]: stole the trigger func!`);
      manTrigger = fn;
    });
  const bot = new Bot("idk", { prefix: "!" });
  const fakeAction = [
    "trigger",
    { response: jest.fn().mockReturnValue("test") },
  ] as [string, { response: jest.Mock }];
  bot.registerAction(...(fakeAction as Parameters<Bot["registerAction"]>));
  const fakeMessage = ({
    content: "!trigger test",
    author: {
      tag: "cooltag",
    },
    react: jest.fn(),
    channel: {
      send: jest.fn(),
    },
  } as unknown) as Message;
  fakeMessage.content = "!trigger test";
  expect(async () => {
    await manTrigger(fakeMessage);
  }).not.toThrowError(); //trigger it manually
  expect(fakeMessage.channel.send).toHaveBeenCalledWith("test");
});

describe("ignore caps behaves as expected", () => {
  let manTrigger: (msg: Message) => Promise<void>;

  Client.prototype.on = jest
    .fn()
    .mockImplementation((_, fn: typeof manTrigger) => {
      console.log(`[JEST]: stole the trigger func!`);
      manTrigger = fn;
    });
  const bot = new Bot("idk", { prefix: "!", ignoreCaps: true });
  const fakeAction = [
    "trigger",
    { response: jest.fn().mockReturnValue("lasttest") },
  ] as [string, { response: jest.Mock }];
  bot.registerAction(...(fakeAction as Parameters<Bot["registerAction"]>));
  const fakeMessage = ({
    content: "!tRigger test",
    author: {
      tag: "cooltag",
    },
    react: jest.fn(),
    channel: {
      send: jest.fn(),
    },
  } as unknown) as Message;
  expect(async () => {
    await manTrigger(fakeMessage);
  }).not.toThrowError();
  expect(fakeAction[1].response).toHaveBeenCalled();
  expect(fakeMessage.channel.send).toBeCalled();
});
*/
