import {
  CommandInteraction,
  Message,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  User,
} from "discord.js";
import { ActionParameters } from ".";

type ComponentAction = Parameters<ActionParameters["subscribe"]>[1];

export class ComponentHandler {
  private pendingSubscriptions: {
    customIds: string[];
    msg: Message | CommandInteraction;
    action: ComponentAction;
    lastUpdate: number; //Date.now()
    timeout: number;
  }[] = [];
  interval: NodeJS.Timeout | undefined = undefined;
  constructor() {
    this.getSubscription = this.getSubscription.bind(this);
    this.renewSubscription = this.renewSubscription.bind(this);
    this.addSubscription = this.addSubscription.bind(this);
    this.clearExpired = this.clearExpired.bind(this);
  }

  getSubscription(customId: string) {
    return this.pendingSubscriptions.find(({ customIds }) =>
      customIds.includes(customId)
    );
  }

  renewSubscription(customId: string, newMsg?: Message | CommandInteraction) {
    const obj = this.pendingSubscriptions.find(({ customIds }) =>
      customIds.includes(customId)
    );
    if (!obj) {
      return;
    }
    obj.msg = !!newMsg ? newMsg : obj.msg;
    obj.lastUpdate = Date.now();
    return obj;
  }

  addSubscription(
    customIds: string[],
    msg: Message | CommandInteraction,
    action: ComponentAction,
    timeout: number = 60000
  ) {
    this.pendingSubscriptions.push({
      msg,
      action,
      customIds,
      timeout,
      lastUpdate: Date.now(),
    });
    if (!this.interval) {
      this.interval = setInterval(
        (() => {
          if (this.pendingSubscriptions.length === 0) {
            this.interval && clearInterval(this.interval);
            this.interval = undefined;
          }
          this.clearExpired();
        }).bind(this),
        20 * 1000
      );
    }
  }

  clearExpired() {
    type element = typeof this.pendingSubscriptions[0];
    const newPendingSubs: (element | undefined)[] = [
      ...this.pendingSubscriptions,
    ];
    for (let i = 0, j = newPendingSubs.length; i < j; i++) {
      const { lastUpdate, timeout } = newPendingSubs[i]!;
      if (lastUpdate + timeout < Date.now()) {
        newPendingSubs[i] = undefined;
      }
    }
    this.pendingSubscriptions = newPendingSubs.filter(Boolean) as element[];
  }

  static getActionRow(
    componentOptions: Parameters<ActionParameters["subscribe"]>[0],
    user: User
  ): [string[], MessageActionRow] {
    const customIdBase = `${user.id}-${Date.now()}`;
    const actionRow = new MessageActionRow();
    if (componentOptions instanceof Array) {
      const customIdArray: string[] = [];
      actionRow.addComponents(
        componentOptions.map((x, i) => {
          const customId = `${customIdBase}-${i}`;
          customIdArray.push(customId);
          return new MessageButton({
            ...x,
            customId,
          } as MessageButton);
        })
      );
      return [customIdArray, actionRow];
    }
    if ("options" in componentOptions) {
      return [
        [customIdBase],
        actionRow.addComponents(
          new MessageSelectMenu({
            disabled: false,
            ...componentOptions,
            maxValues: componentOptions.maxValues ?? undefined,
            minValues: componentOptions.minValues ?? undefined,
            options: componentOptions.options?.map((x) => ({
              ...(x ?? undefined),
              description: x.description ?? undefined,
              emoji: undefined,
            })),
            placeholder: componentOptions.placeholder ?? undefined,
            customId: customIdBase,
          }).setCustomId(customIdBase)
        ),
      ];
    }
    return [
      [customIdBase],
      actionRow.addComponents(
        new MessageButton(componentOptions as MessageButton).setCustomId(
          customIdBase
        )
      ),
    ];
  }
}
