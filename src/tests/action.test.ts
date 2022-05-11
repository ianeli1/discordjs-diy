import { Client, Message } from "discord.js";
import { ActionObject, ActionParameters } from "../types";
import { handleEmoji, report } from "../utility";
jest.mock("discord.js");
jest.mock("../utility", () => ({
  report: jest.fn(),
  handleEmoji: jest.fn().mockImplementation((_, x: string) => x),
}));
//@ts-ignore
import { executeAction } from "../action";
jest.useFakeTimers();
//@ts-ignore
Client.prototype.emojis = {
  cache: {
    find: jest.fn().mockReturnValue("🤓"),
  },
};

const fakeClient = new Client({ intents: [] });
const fakeAction: ActionObject = {
  response: "test",
  reaction: "🤓",
};
const fakeMessage = {
  author: {
    tag: "cooltag",
  },
  react: jest.fn(),
  channel: {
    send: jest.fn(),
  },
} as unknown as Message;

executeAction(
  fakeClient,
  { msg: fakeMessage, args: "args" } as ActionParameters,
  fakeAction
).catch(console.trace);

test("reports that an action has been executed and specifies the trigger", () => {
  expect(report).toHaveBeenCalled();
});

test("if action has reaction, react", () => {
  expect(handleEmoji).toHaveBeenCalledWith(fakeClient, "🤓");
  expect(fakeMessage.react).toHaveBeenCalledWith("🤓");
  expect(Client.prototype.emojis.cache.find).not.toHaveBeenCalled();
});

test("if action has respose, send message to channel", () => {
  expect(fakeMessage.channel.send).toHaveBeenCalledWith("test");
});

test("if action fails, to contain it", () => {
  console.trace = jest.fn();
  fakeAction.response = jest.fn().mockImplementation(() => {
    throw new Error("idk");
  });
  expect(
    () =>
      void executeAction(
        fakeClient,
        { msg: fakeMessage, args: "args" } as ActionParameters,
        fakeAction
      ).catch(console.trace)
  ).not.toThrowError();
});

describe("reaction handling", () => {
  test("reaction function", () => {
    const fakeAction: ActionObject = {
      reaction: jest.fn().mockReturnValue("🤓"),
    };

    executeAction(
      fakeClient,
      { msg: fakeMessage, args: "args" } as ActionParameters,
      fakeAction
    ).catch(console.trace);
    expect(fakeAction.reaction).toHaveBeenCalledWith({
      msg: fakeMessage,
      args: "args",
    } as ActionParameters);
  });

  test("on error", () => {
    console.trace = jest.fn();
    const fakeAction: ActionObject = {
      reaction: jest.fn().mockImplementation(() => {
        throw Error("fake error");
      }),
    };
    executeAction(
      fakeClient,
      { msg: fakeMessage, args: "args" } as ActionParameters,
      fakeAction
    ).catch(console.trace);
  });
});
