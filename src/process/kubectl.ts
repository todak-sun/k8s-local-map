import { spawn } from "child_process";
import { createLogger } from "../logger";
import { Deployment, PortForwardDeplyoment, PortForwardPod } from "../types";

const serializeCommand = (event: string, command: string[]) => `| ${event} | COMMAND - kubectl ${command.join(" ")}`;

const kubectl = async (...command: string[]) => {
  const log = createLogger("kubectl");
  return new Promise<string>((resolve, reject) => {
    const child = spawn(`kubectl`, [...command]);
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
      log.error({ message, options: serializeCommand("child.stderr.on", [...command]) });
      reject(new Error(message));
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

const ku = {
  portForwardWithDeployment: async ({ namespace, deployment, port }: PortForwardDeplyoment) => {},
  portForwardWithPod: async ({ namespace, pod, port }: PortForwardPod) => {
    const message = await kubectl("port-forward", `pods/${pod}`, "-n", namespace, `:${port}`);
    const line = message.split("\n")[0];
    const localPort = Number(line.replace("Forwarding from 127.0.0.1:", "").replace(`-> ${port}`, "").trim());
    return { namespace, pod, containerPort: port, localPort };
  },
  changeContext: async (context: string) => {
    try {
      await kubectl("config", "use-context", context);
      return { success: true, context };
    } catch (e) {
      return { success: false, context: null };
    }
  },
  getPods: async ({ namespace, deployment }: Deployment) => {
    const content = await kubectl(
      "get",
      "pods",
      "-n",
      namespace,
      "-l",
      `app=${deployment}`,
      "--no-headers",
      "-o",
      `custom-columns=${":.metadata.name"},${":.spec.containers[*].ports[*].containerPort"}`
    );

    const result: PortForwardPod[] = [];
    content
      .split("\n")
      .filter((v) => v)
      .forEach((columns) => {
        const [pod, port] = columns
          .split(/ /)
          .filter((v) => v)
          .map((v) => v.trim());
        result.push({
          namespace,
          deployment,
          pod,
          port: Number(port),
        });
      });
    return result;
  },
};

export default ku;
