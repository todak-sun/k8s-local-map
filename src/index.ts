import * as fs from "fs/promises";
import { readSettings } from "./app/settings";
import { configuration } from "./configuration";
import { dockerCompose, ku } from "./process";
import { writeNginxConfFile } from "./proxy";
import { Mapping } from "./types";
import { readFile } from "./utils";

const HOSTS_START_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_START";
const HOSTS_END_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_END";

const resetHost = async () => {
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

  await fs.writeFile(configuration.hostsPath, afterHosts, {
    encoding: "utf-8",
  });
};

async function main() {
  // 해당 프로그램을 통해 호스트 파일을 변환한 적이 있다면, 초기화
  await resetHost();
  // 세팅 읽기
  const settings = await readSettings();
  if (!settings.mappings) {
    throw new Error("설정할 매핑 정보가 존재하지 않습니다.");
  }

  const k8sMappingMap = settings.mappings.reduce((acc, item) => {
    const { context } = item;
    const _context = context || "default";
    (acc[_context] || (acc[_context] = [])).push(item);
    return acc;
  }, {} as Record<string, Mapping[]>);

  // 세팅에 적힌 내용을 토대로, etc/hosts 파일에 작성할 내용 만들기
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
  await fs.writeFile(configuration.hostsPath, updatedEtcdText, { encoding: "utf-8" });

  const nginxConfs = await Promise.all(
    Object.entries(k8sMappingMap).map(async ([context, items]) => {
      return await Promise.all(
        items.map(async ({ namespace, deployment }) => {
          await ku.changeContext(context);
          const [pod] = await ku.getPods({ namespace, deployment });
          const { pod: podName, port } = pod;

          const { localPort } = await ku.portForwardWithPod({ namespace, deployment, pod: podName, port });
          const serverName = `${pod.deployment}.${pod.namespace}`;
          console.log(`http://${serverName} -> http://127.0.0.1:${localPort}`);
          return { serverName, localPort };
        })
      );
    })
  );

  const confContent = nginxConfs.flat(1);
  await writeNginxConfFile(confContent);

  await dockerCompose.up();
}

process.on("SIGINT", async (signal) => {
  console.log(`signal : ${signal}`);
  await resetHost();
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(process.exit(0));
    }, 1000)
  );
});

main();
