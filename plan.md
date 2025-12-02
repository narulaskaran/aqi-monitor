# Plan: Migration to Vercel-Native Architecture

This document outlines the plan to refactor the project to a Vercel-native architecture, which will simplify the build process, improve local development, and resolve the ongoing deployment issues.

## Phase 1: Project Restructuring

-   [x] **Move Prisma Directory:**
    -   [x] Move the `server/prisma` directory to the project root (`/prisma`).
-   [x] **Move Serverless Functions:**
    -   [x] Create a new `/api` directory at the root.
    -   [x] Move the contents of the old `/api` directory (which were just wrappers) to a temporary location.
    -   [x] Move the logic from `server/src/handlers/*.ts` into the new `/api` directory, converting them from Express handlers to Vercel Serverless Functions.
-   [x] **Move Shared Server Code:**
    -   [x] Create a new `/api/_lib` directory.
    -   [x] Move shared logic from `server/src/services/*.ts`, `server/src/middleware/*.ts`, and `server/src/db.ts` into `/api/_lib`.
-   [x] **Delete Old Directories:**
    -   [x] Delete the old `/api` directory.
    -   [x] Delete the entire `/server` directory.

## Phase 2: Configuration and Code Updates

-   [x] **Update `package.json`:**
    -   [x] Merge all dependencies from `server/package.json` into the root `package.json`.
    -   [x] Update the `scripts` section to use `vercel dev`, a simplified `build` script, and a robust `vercel-build` script.
    -   [x] Add the `"prisma": { "schema": "prisma/schema.prisma" }` key.
-   [x] **Update Prisma Configuration:**
    -   [x] Update `prisma/schema.prisma` with `engineType = "client"` and the correct client `output` path (`../node_modules/@prisma/client`).
    -   [x] Create `prisma/prisma.config.ts` to provide the `DATABASE_URL` to the Prisma CLI.
-   [x] **Update `db.ts`:**
    -   [x] Refactor `/api/_lib/db.ts` to use the Neon adapter, `ws`, and a direct `PrismaClient` instantiation.
-   [x] **Update Import Paths:**
    -   [x] Go through all files in `/api/` and `/src/` and fix any broken `import` statements to point to the new file locations (e.g., from `server/src/db` to `api/_lib/db`).
-   [x] **Update `tsconfig.json`:**
    -   [x] Adjust paths, `include`, and `exclude` settings in the root `tsconfig.json` to correctly resolve modules in the new structure. Remove `references` to the old server project.
-   [x] **Update `.gitignore`:**
    -   [x] Ensure `.env` is ignored at the root level.
    -   [x] Remove any server-specific ignores that are no longer needed.

## Phase 3: Validation and Documentation

-   [x] **Run `npm install`:**
    -   [x] Run `npm install` from the root directory to sync all dependencies.
-   [ ] **Local Development Validation:**
    -   [ ] Run `vercel dev` and test the application manually in the browser. (Skipped due to interactivity)
-   [x] **Automated Validation:**
    -   [x] Run `npm run lint` and fix any errors.
    -   [x] Run `npm test` and ensure all tests pass.
    -   [x] Run `npm run build` and ensure the project builds successfully.
    -   [x] Run `vercel build` to double-check the Vercel-specific build process.
-   [x] **Update Documentation:**
    -   [x] Update `README.md` to reflect the new, simpler development and deployment process.
    -   [x] Delete `CLAUDE.md`, `CURSOR.md`, `MIGRATION.md` as they are now obsolete.

## Phase 4: Finalization

-   [x] **Commit and Push:**
    -   [x] Commit all related changes with a descriptive message.
    -   [x] Push the `refactor/vercel-architecture` branch.
