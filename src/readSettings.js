const path = require("path");
const fs = require("fs/promises");

const settingFilePath = path.resolve(__dirname, "settings", "settings.json");

module.exports = async () =>
  await fs
    .readFile(settingFilePath, { encoding: "utf-8" })
    .then((content) => JSON.parse(content));
