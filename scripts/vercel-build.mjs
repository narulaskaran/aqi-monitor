// Run Prisma migrate when DATABASE_URL is available (production).
// Preview deploys often omit it; skip migrate and still generate + build.
// prisma generate loads prisma.config.ts, which requires DATABASE_URL, so
// previews use a dummy URL that generate never connects to.
import { spawnSync } from "node:child_process";

const dummyDatabaseUrl = "postgresql://user:password@localhost:5432/dbname";

if (process.env.DATABASE_URL) {
  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
  });
  if (migrate.status) process.exit(migrate.status);
} else {
  console.log("vercel-build: DATABASE_URL not set, skipping migrate deploy");
  process.env.DATABASE_URL = dummyDatabaseUrl;
}

const build = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(build.status ?? 1);
