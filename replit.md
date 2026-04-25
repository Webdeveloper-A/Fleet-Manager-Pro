# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Fleet Docs (artifacts/fleet-docs)

A multi-tenant fleet vehicle & document management app (Road24-style).

- **Frontend**: React + Vite + Tailwind + shadcn/ui + Zustand + React Query (`artifacts/fleet-docs`)
- **Backend**: Express on port 8080 (`artifacts/api-server`)
- **Auth**: JWT bearer tokens stored in `localStorage["fleet_docs_token"]`. `JWT_SECRET` falls back to `SESSION_SECRET`. Token TTL 7d.
- **Roles**: `admin` (manages tenant companies) and `company` (manages own vehicles + documents)
- **Status logic**: `valid` if more than 15 days remain, `expiring` 0–15 days, `expired` past end date
- **Notifications**: `node-cron` job in `artifacts/api-server/src/lib/expiryJob.ts` runs at boot+5s and 06/12/18h, generating notifications for documents expiring within 10 days
- **File uploads**: Object Storage via `@workspace/object-storage-web` Uppy uploader. The PUT URL is requested via `useRequestUploadUrl` then the returned `objectPath` is stored on the document.
- **Seed data**: `artifacts/api-server/src/lib/seed.ts` creates `admin@fleetdocs.app/admin1234` and `demo@fleetdocs.app/demo1234` (Northwind Logistics) with 3 vehicles + 6 documents in mixed status.
- **Custom-fetch hack**: `lib/api-client-react/src/custom-fetch.ts` injects the bearer token from `localStorage` directly when no auth getter is registered. Cross-package side-effect for the Fleet Docs frontend.

