import * as path from "path";
import { configuration } from "../configuration";
import { createLogger } from "../logger";
import { PortForwardResult } from "../types";
import { makeDirectory, writeFile } from "../utils";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

type Props = {
  serverName: string;
  localPort: number;
};

export const templateNginxConf = ({ serverName, localPort }: Props) => {
  const logger = createLogger("templateNginxConf");
  logger.debug({ message: `create for ${serverName}:${localPort}` });
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

export const createNginxReverseProxyConfig = async (portForwardResults: PortForwardResult[]) => {
  const confDirectory = path.resolve(configuration.assetsPath, "etc", "nginx", "conf.d");
  const content = portForwardResults.map((item) => templateNginxConf(item)).join("\n");
  await makeDirectory(confDirectory);
  await writeFile(path.resolve(confDirectory, "default.conf"), content);
};

export const createReverseProxyServer = (portForwardResults: PortForwardResult[]) => {
  const log = createLogger("createReverseProxyServer");
  const app = express();
  const router: Record<string, string> = {};
  portForwardResults.forEach(({ localPort, serverName }) => {
    router[serverName] = `http://localhost:${localPort}`;
  });

  const proxyMiddleware = createProxyMiddleware({
    router,
    logLevel: "debug",
  });

  app.use("", proxyMiddleware);
  const server = app.listen(80, () => {
    log.debug({ message: "Proxy Server Start" });
  });

  server.on("close", () => {
    log.debug({ message: "Proxy Server Close" });
  });
  return server;
};
