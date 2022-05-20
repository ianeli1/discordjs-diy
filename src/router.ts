import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
} from "@discordjs/builders";
import autobind from "autobind-decorator";
import { Bot } from ".";
import { CommandsHandler } from "./handler";
import { RoutedAction } from "./routedAction";
import { SlashCommands } from "./slashCommands";
import { BotAction, ActionObject, ResponseAction } from "./types";
import { firstWord, printNested, report as _report } from "./utility";

interface RouterOptions {
    ignoreCaps: boolean;
}

type CommandCollection = (
    | SlashCommandBuilder
    | SlashCommandSubcommandBuilder
)[];

export class Router {
    public trigger: string | undefined = undefined;
    private handler: CommandsHandler = new CommandsHandler();
    _bot: Bot;
    parent: Router | undefined = undefined;
    options: RouterOptions;
    readonly errorAction: ActionObject;

    constructor() {
        this.options = {
            ignoreCaps: false,
        };
    }

    @autobind
    compileAll(nesting = 0): CommandCollection {
        const commands: CommandCollection = [];
        const classType = this.isGlobal()
            ? SlashCommandBuilder
            : SlashCommandSubcommandBuilder;
        printNested(nesting, `[Router(${this.trigger})]`);
        for (const trigger in this.handler.stringActions) {
            const command = new classType()
                .setName(trigger)
                .setDescription("A command");
            const actionObj = this.handler.stringActions[trigger];
            if (actionObj instanceof Router) {
                printNested(nesting, "-> Router");
                const thisCommand = this.isGlobal()
                    ? (command as SlashCommandBuilder)
                    : new SlashCommandSubcommandGroupBuilder()
                          .setName(trigger)
                          .setDescription("A description");
                actionObj
                    .compileAll(nesting + 1)
                    .forEach((com) =>
                        thisCommand.addSubcommand(
                            com as SlashCommandSubcommandBuilder
                        )
                    );
                if (thisCommand instanceof SlashCommandSubcommandGroupBuilder) {
                    (command as SlashCommandBuilder).addSubcommandGroup(
                        thisCommand
                    );
                }
                commands.push(command);
                continue;
            }
            printNested(nesting, `-> Command: ${trigger}`);
            //if it's a regular command
            const compiled = SlashCommands.createSlashCommandParams(
                trigger,
                actionObj.description ?? "A command",
                actionObj.parameters,
                classType
            );
            commands.push(compiled);
        }
        return commands;
    }

    /**
     * @returns an error action available in the route, if any
     */
    @autobind
    findError(): ActionObject | undefined {
        if (!this.errorAction) {
            return this.parent?.findError();
        }
        return this.errorAction;
    }

    @autobind
    findAction(content: string): RoutedAction | undefined {
        this.report(`Content: "${content}"`);
        const searchResult = this.handler.findAction(
            this.options.ignoreCaps
                ? firstWord(content).toLowerCase()
                : firstWord(content)
        );
        if (searchResult instanceof Router) {
            let newContent = (
                this.options.ignoreCaps ? content.toLowerCase() : content
            )
                .replace(searchResult.trigger ?? "", "")
                .trim();
            return searchResult.findAction(newContent);
        }
        return searchResult && new RoutedAction(this, searchResult);
    }

    /**
     * Creates a new action that the bot will react to.
     * Replaces the now deprecated `registerAction`
     * @param trigger Name of the trigger
     * @param action Action to perform on this command
     * @param parameters [Optional] Parameters to be registered for slash command, defaults to [{name: "arguments", type: "STRING"}]
     * @returns
     */
    @autobind
    on<T extends BotAction>(
        trigger: string | string[] | RegExp,
        action: T,
        parameters?: T extends Router ? never : ActionObject["parameters"]
    ) {
        const isRouter = action instanceof Router;
        if (isRouter) {
            if (typeof trigger === "string") {
                action.trigger = trigger;
                action._bot = this._bot;
                action.options.ignoreCaps = this._bot.ignoreCaps;
                action.parent = this;
            } else throw new Error("Routers only support string triggers");
        }
        trigger =
            this.options.ignoreCaps && typeof trigger === "string"
                ? trigger.toLowerCase()
                : trigger;

        const paddedAction = isRouter
            ? action
            : this.padAction(action, parameters);
        this.report(
            `[Trigger: "${trigger}"] =>`,
            isRouter
                ? `Routing to Router(${trigger})`
                : `Created a new action => (${[
                      (paddedAction as ActionObject).response && "response",
                      (paddedAction as ActionObject).reaction && "reaction",
                      (paddedAction as ActionObject).onError && "onErr",
                  ].filter(Boolean)})`
        );
        this.handler.setAction(
            trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger,
            paddedAction as ActionObject | Router
        );
        return this;
    }

    @autobind
    onDefault(action: Exclude<BotAction, Router>) {
        this.handler.setDefaultAction(this.padAction(action));
        return this;
    }

    @autobind
    onError(action: Exclude<BotAction, Router>) {
        (this.errorAction as ActionObject) = this.padAction(action);
        return this;
    }

    @autobind
    removeAction(trigger: string | RegExp | string[]) {
        this.report(`Removed an action, trigger: ${trigger}`);
        return this.handler.removeAction(
            trigger instanceof Array ? this.turnArrayToRegex(trigger) : trigger
        );
    }

    @autobind
    report(...stuff: any[]) {
        const reportFn = this._bot?.report ?? _report;

        reportFn(
            `[Router(${
                this.trigger ??
                (this.isGlobal() ? "@Bot" : "<trigger to be assigned>")
            })] =>`,
            ...stuff
        );
    }

    @autobind
    isGlobal() {
        return this === this._bot?.router;
    }

    private padAction(action: Router): Router;
    private padAction(
        action: Exclude<BotAction, Router>,
        parameters?: ActionObject["parameters"]
    ): ActionObject;
    private padAction(
        action: BotAction,
        parameters?: ActionObject["parameters"]
    ): ActionObject | Router {
        if (action instanceof Router) {
            return action;
        }
        if (
            typeof action === "object" &&
            ("response" in action || "reaction" in action)
        ) {
            return parameters ? { ...action, parameters } : action;
        }
        return {
            response: action as ResponseAction,
            parameters,
        };
    }

    private turnArrayToRegex(trigger: string[]): RegExp {
        return new RegExp(
            `(${trigger.join("|")})`,
            this.options.ignoreCaps ? "i" : undefined
        );
    }
}
