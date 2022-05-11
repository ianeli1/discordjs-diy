type ActionType = "response" | "reaction" | "unknown";

export class ActionError extends Error {
  constructor(
    public type: ActionType,
    message: string = "",
    public e: any = new Error()
  ) {
    super(message);
  }
}
