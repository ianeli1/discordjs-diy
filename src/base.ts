import autobind from "autobind-decorator";
import { ActivityOptions, Client, ClientOptions, Intents } from "discord.js";
import { report as _report, pick } from "./utility";

let botCount = 0;
type PresenceType = Required<ActivityOptions["type"]>;

export class BotBase {
  id: number;
  private presenceInterval: NodeJS.Timeout;

  /**Discord.js client object */
  readonly client: Client;

  name: string | undefined = undefined;

  constructor(readonly token: string, intents?: ClientOptions["intents"]) {
    if (!token) throw new Error("No token was provided");
    this.id = botCount++;
    this.token = token;
    this.client = new Client({
      intents: intents ?? [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    });
    this.client.login(this.token);
    this.client.once("ready", () => {
      this.name = this.client.user?.tag;
      this.report(`Bot created and logged in`);
    });
  }

  setPresence(
    activities: [string, PresenceType] | [string, PresenceType][],
    interval: number = 10 * 60 * 1000 /*10 minutes*/
  ) {
    function setActivity(this: BotBase, activity: [string, PresenceType]) {
      this.client.user?.setActivity(activity[0], { type: activity[1] }) ??
        this.report(
          "User missing from client object, bot was unable to update presence."
        );
    }

    if (activities.length === 0)
      throw new Error("Presence list can't be empty");

    clearInterval(this.presenceInterval);
    if (activities[0] instanceof Array) {
      this.presenceInterval = setInterval(() => {
        setActivity.bind(this, pick(activities))();
      }, interval);
    } else {
      setActivity.bind(this, activities)();
    }
  }

  @autobind
  report(...stuff: any[]) {
    _report(`[Bot(${this.name ?? this.id})] =>`, ...stuff);
  }
}
