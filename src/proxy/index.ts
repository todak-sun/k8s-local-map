import { createLogger } from "../logger";
import { configuration } from "../configuration";
import { makeDirectory, writeFile } from "../utils";
import * as path from "path";

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

export const writeNginxConfFile = async (items: Props[]) => {
  const confDirectory = path.resolve(configuration.assetsPath, "etc", "nginx", "conf.d");
  const content = items.map((item) => templateNginxConf(item)).join("\n");
  await makeDirectory(confDirectory);
  await writeFile(path.resolve(confDirectory, "default.conf"), content);
};
