type ActionType = "response" | "reaction";

export class ActionError extends Error {
  constructor(public type: ActionType, message?: string, public e?: any) {
    super(message);
  }
}
