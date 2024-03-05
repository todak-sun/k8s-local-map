const { spawn } = require("child_process");
const { debug } = require("./log");

const kubectl = async (...command) =>
  new Promise((resolve, reject) => {
    const child = spawn(`kubectl`, [...command]);

    child.stdout.on("data", (data) => {
      const message = data.toString();
      message
        .split("\n")
        .filter((v) => v)
        .forEach((item) => {
          debug({
            command: [...command],
            context: "child.stdout.on.data",
            message: item,
          });
        });

      resolve(message);
    });

    child.stdout.on("close", () => {
      debug({
        command: [...command],
        context: "child.stdout.on.close",
      });
    });
    child.stderr.on("data", (chunk) => {
      const message = chunk.toString();
      reject(new Error(message));
    });
    child.on("message", (message, sendHandle) => {
      debug({
        command: [...command],
        context: "child.on.message",
        message: message,
      });
    });
    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code, signal) => {
      debug({
        command: [...command],
        context: "child.on.close",
        message: JSON.stringify({ code, signal }),
      });
    });
    child.on("disconnect", () => {
      debug({
        command: [...command],
        context: "child.on.disconnect",
      });
    });
    child.on("exit", (code, signal) => {
      debug({
        command: [...command],
        context: "child.on.exit",
        message: JSON.stringify({ code, signal }),
      });
    });
  });

const ku = {
  portForwardWithDeployment: async (namespace, deployment, port) => {},
  portForwardWithPod: async (namespace, pod, port) => {
    const message = await kubectl(
      "port-forward",
      `pods/${pod}`,
      "-n",
      namespace,
      `:${port}`
    );
    const line = message.split("\n")[0];
    const localPort = Number(
      line
        .replace("Forwarding from 127.0.0.1:", "")
        .replace(`-> ${port}`, "")
        .trim()
    );
    return { namespace, pod, containerPort: port, localPort };
  },
  changeContext: async (context) => {
    try {
      await kubectl("config", "use-context", context);
      return { success: true, context };
    } catch (e) {
      return { success: false, context: null };
    }
  },
  getPods: async (namespace, deployment) => {
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

    const result = [];
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

module.exports = ku;
