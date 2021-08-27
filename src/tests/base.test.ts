import { Client } from "discord.js";
//import { report } from "../utility";
import { BotBase } from "../base";
jest.mock("../utility", () => ({
  report: jest.fn(),
}));
jest.mock("discord.js");

Client.prototype.login = jest.fn();
//@ts-ignore
Client.prototype.on = (event: string, cb: () => void) => {
  event === "ready" && cb();
  return this;
};

test("fail if no token is provided", () => {
  expect(() => void new BotBase(undefined!)).toThrow("No token was provided");
});

test("login if token is provided", () => {
  const token = "someToken";
  new BotBase(token);
  expect(Client.prototype.login).toHaveBeenCalledWith(token);
});

/*
//Test is useless as there's no way to await a constructor call

test("report when bot is online", () => {
  const token = "someToken";
  new BotBase(token);
  expect(report).toHaveBeenCalled();
});*/
