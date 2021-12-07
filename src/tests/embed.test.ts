import { Embed } from "../embed";

describe("constructor", () => {
  test("should not give an error", () => {
    expect(() => new Embed({})).not.toThrowError();
  });
});

let embed: Embed;

describe("create", () => {
  beforeAll(() => {
    embed = new Embed({});
  });

  test("should not give an error", () => {
    //@ts-expect-error
    expect(() => embed.create({})).not.toThrowError();
  });
});
