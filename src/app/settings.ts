import { Settings } from "../types";
import * as path from "path";
import { configuration } from "../configuration";
import { readFile } from "../utils/files";

export const readSettings = async (profile: string = "default"): Promise<Settings> => {
  const settingFilePath: string = path.join(configuration.assetsPath, "settings", `${profile}.setting.json`);
  return await readFile<Settings>(settingFilePath, (content) => JSON.parse(content) as Settings);
};
