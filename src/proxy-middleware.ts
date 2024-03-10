import { ku } from "./process";
import { Mapping } from "./types";
import { createProxyMiddleware } from "http-proxy-middleware";
import express from "express";

async function main() {
  const mapping: Mapping = { namespace: "platform", deployment: "tx-url-shortener", context: "tx-k8s-test2" };
  await ku.changeContext(mapping.context!);
  const [pod] = await ku.getPods(mapping);
  const { localPort } = await ku.portForwardWithPod(pod);

  const domain = `${mapping.deployment}.${mapping.namespace}`;
  const proxy = createProxyMiddleware({
    router: {
      [domain]: `http://localhost:${localPort}`,
    },
    logLevel: "debug",
  });

  const app = express();
  app.use("", proxy);
  app.listen(80);
}

main();
