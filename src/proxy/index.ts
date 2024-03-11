import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Options, Request } from "http-proxy-middleware/dist/types";
import { createLogger } from "../logger";
import { ProxyTable } from "../types";

export const createReverseProxyLoadBalanceServer = (table: ProxyTable) => {
  const log = createLogger("createReverseProxyLoadBalanceServer");
  const app = express();
  const memo = new Map<string, number>();

  const router = (request: Request): Options["target"] => {
    const hostname = request.hostname;
    if (!memo.has(hostname)) {
      memo.set(hostname, 0);
    }
    const ports = table[hostname];
    const currentCount = memo.get(hostname)!;
    const index = currentCount % ports.length;
    memo.set(hostname, currentCount + 1);
    const target = ports[index];

    return {
      protocol: "http:",
      host: "127.0.0.1",
      port: target.port,
    };
  };

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
