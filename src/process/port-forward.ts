import { createLogger } from "../logger";
import { ku } from ".";
import { Mapping, PortForwardResult } from "../types";

export const portForward = async (k8sMappingMap: Record<string, Mapping[]>): Promise<PortForwardResult[]> => {
  const log = createLogger("portForward");
  return await Promise.all(
    Object.entries(k8sMappingMap).map(async ([context, items]) => {
      await ku.changeContext(context);
      return await Promise.all(
        items.map(async ({ namespace, deployment }) => {
          const [pod] = await ku.getPods({ namespace, deployment });
          const { pod: podName, port } = pod;
          const { localPort } = await ku.portForwardWithPod({ namespace, deployment, pod: podName, port });
          const serverName = `${pod.deployment}.${pod.namespace}`;
          log.debug({ message: `http://${serverName} -> http://127.0.0.1:${localPort}` });
          return { serverName, localPort };
        })
      );
    })
  ).then((items) => items.flat(1));
};
