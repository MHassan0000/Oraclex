# Oraclex RAG Platform

Production-grade RAG SaaS foundation built with Next.js App Router, TypeScript, Tailwind, and shadcn/ui.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Architecture highlights

- App Router with server/client boundaries and providers
- Ambient dark theme + light theme via CSS variables
- Modular app shell with sidebar, topbar, and responsive layout
- Framer Motion utilities for product-grade motion
- Zod-based environment validation and reusable utilities

## Project structure

```
app/
  (root)/
    layout.tsx
    loading.tsx
    page.tsx
    error.tsx
  api/
    health/route.ts
  globals.css
  layout.tsx
  providers.tsx
  not-found.tsx
components/
  app-shell/
  icons/
  ui/
  brand.tsx
  theme-toggle.tsx
config/
  app-shell.ts
  site.ts
hooks/
  use-media-query.ts
  use-mounted.ts
lib/
  env/
  client/
  server/
  constants.ts
  http.ts
  types.ts
  utils.ts
```

## Useful scripts

```bash
npm run lint
npm run format
npm run format:check
```
