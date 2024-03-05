const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const isDev = require("./isDev");
const readSettings = require("./readSettings");
const ku = require("./ku");

const createNginxConf = ({ serverName, localPort }) => {
  return `server {
    listen       80;
    listen  [::]:80;
    server_name  ${serverName};

    location / {
        proxy_pass http://host.docker.internal:${localPort};
    }
}
`;
};

const HOSTS_START_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_START";
const HOSTS_END_COMMENT = "# FOR_DEVELOPMENT_WITH_K8S_END";

const resetHost = async (hostFilePath) => {
  const content = await fs.readFile(hostFilePath, { encoding: "utf-8" });
  const lines = content.split("\n");

  const startIndex = lines.findIndex((line) => line === HOSTS_START_COMMENT);
  const endIndex = lines.findIndex((line) => line === HOSTS_END_COMMENT);

  const resetHostsLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (i >= startIndex && i <= endIndex) {
      continue;
    }
    resetHostsLines.push(lines[i]);
  }
  await fs.writeFile(
    hostFilePath,
    resetHostsLines.join("\n").replace(/\n+/gi, "\n").trim(),
    {
      encoding: "utf-8",
    }
  );
};

const hostFilePath = isDev()
  ? path.resolve(__dirname, "..", "tests", "hosts")
  : path.resolve("/", "etc", "hosts");

async function main() {
  // 해당 프로그램을 통해 호스트 파일을 변환한 적이 있다면, 초기화
  await resetHost(hostFilePath);

  // 세팅 읽기
  const settings = await readSettings();
  const settingMap = settings.mappings.reduce((acc, item) => {
    const { context } = item;
    const _context = context || "default";
    (acc[_context] || (acc[_context] = [])).push(item);
    return acc;
  }, {});

  // 세팅에 적힌 내용을 토대로, etc/hosts 파일에 작성할 내용 만들기
  const textToWrite = ["\n", HOSTS_START_COMMENT];
  Object.entries(settingMap).forEach(([context, items]) => {
    items.forEach(({ deployment, namespace }) => {
      textToWrite.push(
        `127.0.0.1\t${deployment}.${namespace} # context=${context} namespace=${namespace} deployment=${deployment}`
      );
    });
  });
  textToWrite.push(HOSTS_END_COMMENT);

  // etc/hosts 파일 업데이트
  const content = await fs.readFile(hostFilePath, { encoding: "utf-8" });
  const updatedEtcdText = [content, textToWrite.join("\n")].join("");
  await fs.writeFile(hostFilePath, updatedEtcdText, { encoding: "utf-8" });
}

(async () => {
  const settings = await readSettings();
  const k8sSettings = settings.mappings.reduce((acc, item) => {
    const { context } = item;
    const _context = context || "default";
    (acc[_context] || (acc[_context] = [])).push(item);
    return acc;
  }, {});

  const nginxConfs = await Promise.all(
    Object.entries(k8sSettings).map(async ([context, items]) => {
      return await Promise.all(
        items.map(async ({ namespace, deployment }) => {
          await ku.changeContext(context);
          const [pod] = await ku.getPods(namespace, deployment);
          const { pod: podName, port } = pod;

          const { localPort } = await ku.portForwardWithPod(
            namespace,
            podName,
            port
          );
          const serverName = `${pod.deployment}.${pod.namespace}`;
          console.log(`http://${serverName} -> http://127.0.0.1:${localPort}`);
          return createNginxConf({ serverName, localPort });
        })
      );
    })
  );

  const confContent = nginxConfs.flat(1).join("\n");
  await fs.writeFile(
    path.join(__dirname, "settings", "conf.d", "default.conf"),
    confContent,
    { encoding: "utf-8" }
  );
})();

process.on("SIGINT", async (signal) => {
  console.log(`signal : ${signal}`);
  await resetHost(hostFilePath);
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(process.exit(0));
    }, 1000)
  );
});
