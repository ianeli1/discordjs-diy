import { Router } from "./router";
import { ActionObject } from "./types";

export class RoutedAction implements ActionObject {
  description?: string | undefined;
  onError?: ActionObject["onError"];
  parameters?: ActionObject["parameters"];
  response?: ActionObject["response"];
  reaction?: ActionObject["reaction"];
  constructor(public router: Router, public rawAction: ActionObject) {
    this.description = rawAction.description;
    this.onError = rawAction.onError;
    this.parameters = rawAction.parameters;
    this.reaction = rawAction.reaction;
    this.response = rawAction.response;
    this.routeError = this.routeError.bind(this);
  }

  routeError() {
    return this.onError && new RoutedAction(this.router, this.onError);
  }
}
