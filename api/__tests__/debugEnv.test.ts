import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const ENV_PRESENCE_LEAK =
  /HAS_DATABASE_URL|HAS_POSTGRES_PRISMA_URL|HAS_POSTGRES_URL|HAS_GOOGLE_API_KEY/;

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "__tests__" || entry === "node_modules") continue;
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listTsFiles(fullPath));
    } else if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("/api/debug-env", () => {
  it("is not present as a deployed Vercel function", () => {
    expect(existsSync(join(apiDir, "debug-env.ts"))).toBe(false);
    expect(existsSync(join(apiDir, "debug-env.js"))).toBe(false);
  });

  it("does not expose env-presence flags from any API handler", () => {
    const leaked: string[] = [];
    for (const file of listTsFiles(apiDir)) {
      const source = readFileSync(file, "utf8");
      if (ENV_PRESENCE_LEAK.test(source)) {
        leaked.push(file.slice(apiDir.length + 1));
      }
    }
    expect(leaked).toEqual([]);
  });
});
