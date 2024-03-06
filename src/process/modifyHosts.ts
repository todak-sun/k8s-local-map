import * as fs from "fs/promises";
import * as sudo from "sudo-prompt";
import { configuration } from "../configuration";
import { Mapping } from "../types";
import { readFile } from "../utils";
import { createLogger } from "../logger";

const HOSTS_START_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_START";
const HOSTS_END_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_END";

export const clearUnusedHosts = async () => {
  const log = createLogger("clearUnusedHosts");
  const lines = await readFile(configuration.hostsPath, (content) => content.split("\n"));
  const startIndex = lines.findIndex((line) => line.startsWith(HOSTS_START_COMMENT));
  const endIndex = lines.findLastIndex((line) => line.startsWith(HOSTS_END_COMMENT));

  const resetHostsLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i >= startIndex && i <= endIndex) {
      continue;
    }
    resetHostsLines.push(lines[i]);
  }

  const afterHosts = resetHostsLines.join("\n").replace(/\n+/, "\n").trim();
  await new Promise((resolve) => {
    sudo.exec(`echo "${afterHosts}" > ${configuration.hostsPath}`, { name: "k8s local mapper" }, (error, stdout, stderr) => {
      if (error) {
        log.error({ message: error.message });
        process.exit(1);
      }
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        log.error({ message: stderr?.toString() });
      }
      resolve(true);
    });
  });
};

export const modifyHosts = async (k8sMappingMap: Record<string, Mapping[]>) => {
  await clearUnusedHosts();
  // 세팅에 적힌 내용을 토대로, etc/hosts 파일에 작성할 내용 만들기
  const log = createLogger("modifyHosts");
  const textToWrite = ["\n", HOSTS_START_COMMENT];
  Object.entries(k8sMappingMap).forEach(([context, items]) => {
    items.forEach(({ deployment, namespace }) => {
      textToWrite.push(`127.0.0.1\t${deployment}.${namespace} # context=${context} namespace=${namespace} deployment=${deployment}`);
    });
  });
  textToWrite.push(HOSTS_END_COMMENT);

  // etc/hosts 파일 업데이트
  const content = await fs.readFile(configuration.hostsPath, { encoding: "utf-8" });
  const updatedEtcdText = [content, textToWrite.join("\n")].join("");
  await new Promise((resolve) => {
    sudo.exec(`echo "${updatedEtcdText}" > ${configuration.hostsPath}`, { name: "k8s local mapper" }, (error, stdout, stderr) => {
      if (error) {
        log.error({ message: error.message });
        process.exit(1);
      }
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        log.error({ message: stderr?.toString() });
      }
      resolve(true);
    });
  });
};
