import * as fs from "fs/promises";

const identity = <T>(v: T) => v;
export const readFile = async <T>(path: string, converter?: (content: string) => T): Promise<T> => {
  const content = await fs.readFile(path, { encoding: "utf-8" });
  return converter ? converter(content) : identity<T>(content as T);
};

export const writeFile = async (path: string, data: string) => {
  await fs.writeFile(path, data);
};
export const makeDirectory = async (path: string) => {
  await fs.mkdir(path, { recursive: true });
};
