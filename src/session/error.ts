import { report as mainReport } from "../utility";

export function report(...log: any[]) {
  mainReport("[Session] =>", ...log);
}
