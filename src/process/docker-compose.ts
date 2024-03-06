import { spawn } from "child_process";
import * as path from "path";
import { createLogger } from "../logger";
import { configuration } from "../configuration";

const serializeCommand = (event: string, command: string[]) => `| ${event} | COMMAND - docker compose ${command.join(" ")}`;

const dockerCompose = async (...command: string[]) => {
  const log = createLogger("dockerCompose");
  return new Promise<string>((resolve, reject) => {
    const child = spawn(`docker`, ["compose", ...command]);
    child.stdout.on("data", (chunk: any) => {
      const message: string = chunk.toString();
      message
        .split("\n")
        .filter((v) => v)
        .forEach((item) => {
          log.debug({
            options: serializeCommand("child.stdout.on.data", [...command]),

            message: item,
          });
        });
      resolve(message);
    });

    child.stdout.on("close", () => {
      log.debug({
        options: serializeCommand("child.stdout.on.close", [...command]),
      });
    });

    child.stderr.on("data", (chunk) => {
      const message = chunk.toString();
      log.error({ message });
    });
    child.on("message", (message, sendHandle) => {
      log.debug({
        options: serializeCommand("child.on.message", [...command]),
        message: message.toString(),
      });
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code, signal) => {
      log.debug({
        options: serializeCommand("child.on.close", [...command]),
        message: JSON.stringify({ code, signal }),
      });
    });
    child.on("disconnect", () => {
      log.debug({
        options: serializeCommand("child.on.disconnect", [...command]),
      });
    });
    child.on("exit", (code, signal) => {
      log.debug({
        options: serializeCommand("child.on.exit", [...command]),
        message: JSON.stringify({ code, signal }),
      });
    });
  });
};

const PROJECT_NAME = "k8s-local-map";

export default {
  up: async () => {
    dockerCompose("-f", path.resolve(configuration.assetsPath, "docker-compose.yaml"), "-p", PROJECT_NAME, "up");
  },
  down: async () => {
    dockerCompose("down", "-p", PROJECT_NAME);
  },
};
