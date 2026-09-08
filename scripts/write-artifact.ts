import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function writeJsonArtifact(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
