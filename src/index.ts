import { readSettings } from "./app/settings";
import { createLogger } from "./logger";
import { dockerCompose, modifyHosts, portForward, clearUnusedHosts } from "./process";
import { createNginxReverseProxyConfig } from "./proxy";
import { Mapping } from "./types";

async function main() {
  const settings = await readSettings();
  if (!settings.mappings?.length) {
    throw new Error("설정할 매핑 정보가 존재하지 않습니다.");
  }

  const k8sMappingMap = settings.mappings.reduce((acc, item) => {
    const { context } = item;
    const _context = context || "default";
    (acc[_context] || (acc[_context] = [])).push(item);
    return acc;
  }, {} as Record<string, Mapping[]>);

  const portForwardResults = await portForward(k8sMappingMap);
  await createNginxReverseProxyConfig(portForwardResults);
  await dockerCompose.up();
  await modifyHosts(k8sMappingMap);
}

main();

const gracefulShutdown: NodeJS.SignalsListener = async (signal) => {
  const log = createLogger("gracefulShutdown");
  await dockerCompose.down();
  await new Promise((resolve) => {
    log.debug({ message: "Gracefully Shutdown..." });
    setTimeout(() => {
      resolve(process.exit(0));
    }, 3000);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
