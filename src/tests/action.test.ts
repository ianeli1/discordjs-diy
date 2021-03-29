import { Client, Message } from "discord.js";
import { Action } from "../types";
import { handleEmoji, report } from "../utility";
jest.mock("discord.js");
jest.mock("../utility", () => ({
  report: jest.fn(),
  handleEmoji: jest.fn().mockImplementation((_, x: string) => x),
}));
import { executeAction } from "../action";
//@ts-ignore
Client.prototype.emojis = {
  cache: {
    find: jest.fn().mockReturnValue("🤓"),
  },
};

const fakeClient = new Client();
const fakeAction: Action = {
  trigger: "FakeAction",
  response: "test",
  reaction: "🤓",
};
const fakeMessage = ({
  author: {
    tag: "cooltag",
  },
  react: jest.fn(),
  channel: {
    send: jest.fn(),
  },
} as unknown) as Message;
executeAction(fakeClient, fakeMessage, "args", fakeAction);

test("reports that an action has been executed and specifies the trigger", () => {
  expect(report).toHaveBeenCalledWith(
    expect.stringContaining(fakeAction.trigger)
  );
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
    () => void executeAction(fakeClient, fakeMessage, "args", fakeAction)
  ).not.toThrowError();
  expect(console.trace).toHaveBeenCalled();
});
