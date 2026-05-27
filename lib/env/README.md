# Environment variables

Validated environment configuration lives in `lib/env`.

- `client.ts` exports `clientEnv` for public variables (`NEXT_PUBLIC_*`).
- `server.ts` exports `serverEnv` and enforces server-only usage.

Add new variables to the Zod schema and `.env.example`.
