import { Router } from "./router";
import { ActionObject } from "./types";

export class RoutedAction implements ActionObject {
  description?: string | undefined;
  onError?: ActionObject["onError"];
  parameters?: ActionObject["parameters"];
  response?: ActionObject["response"];
  reaction?: ActionObject["reaction"];
  constructor(public router: Router, action: ActionObject) {
    this.description = action.description;
    this.onError = action.onError;
    this.parameters = action.parameters;
    this.reaction = action.reaction;
    this.response = action.response;
    this.routeError = this.routeError.bind(this);
  }

  routeError() {
    return this.onError && new RoutedAction(this.router, this.onError);
  }
}
