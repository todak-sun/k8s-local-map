export type Deployment = {
  namespace: string;
  deployment: string;
};

export type Pod = Deployment & {
  pod: string;
};

export type PortForwardDeplyoment = Deployment & {
  port: number;
};

export type PortForwardPod = Pod & {
  port: number;
};

export type Mapping = {
  context?: string;
  deployment: string;
  namespace: string;
};

export type Settings = {
  mappings?: Mapping[];
};

export type PortForwardResult = {
  serverName: string;
  localPort: number;
};
