import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");

/** Load local .env for CLI scripts. Does not print or return secret values. */
export function loadLlmEnvFile(): void {
  if (process.env.LLM_API_KEY?.trim()) {
    return;
  }
  if (!existsSync(ENV_PATH)) {
    return;
  }
  const loadEnvFile = (
    process as NodeJS.Process & { loadEnvFile?: (path: string) => void }
  ).loadEnvFile;
  if (typeof loadEnvFile === "function") {
    loadEnvFile(ENV_PATH);
    return;
  }

  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
