import * as path from "path";
import { isDev } from "../utils";

console.log(process.cwd());

export const configuration = {
  assetsPath: path.resolve(process.cwd(), "assets"),
  hostsPath: isDev() ? path.resolve(process.cwd(), "tests", "hosts") : "/etc/hosts",
};
