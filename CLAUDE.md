# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Next.js on port 3000)
npm run build        # Production build
npm run lint         # ESLint via next lint

npm run db:migrate   # Run Prisma migrations (local SQLite dev)
npm run db:seed      # Seed the database (tsx prisma/seed.ts)
npm run db:studio    # Open Prisma Studio
npm run db:migrate:prod   # Run migrations against Azure SQL (uses schema.prod.prisma)
npm run db:push:prod      # Push schema to Azure SQL without migrations
```

## Architecture

### Tech Stack
- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Prisma** ORM — dual schema: `prisma/schema.prisma` (SQLite/libsql for local dev), `prisma/schema.prod.prisma` (Azure SQL Server for prod). `src/lib/prisma.ts` auto-selects adapter based on `DATABASE_URL` prefix.
- **Zustand** for client state (`src/stores/`)
- **Tailwind CSS** + CSS variables for theming (light/dark, accent colors)
- **JetBrains Mono** — the only font used throughout the app

### Azure Services
All Azure config lives in `src/lib/env.ts`. Each service has a `is*Configured()` guard — features gracefully degrade when Azure is not configured.

| Service | Purpose | Config prefix |
|---|---|---|
| Azure Entra ID | Auth via NextAuth | `AZURE_AD_*` |
| Azure AI Foundry | GPT + Claude model deployments | `AZURE_AI_FOUNDRY_*` / `AZURE_OPENAI_*` / `AZURE_CLAUDE_*` |
| Azure AI Search | Semantic/vector search + RAG | `AZURE_AI_SEARCH_*` |
| Azure Blob Storage | File uploads | `AZURE_STORAGE_*` |

AI model names are centralized in `src/lib/ai/models.ts`. The app uses GPT for fast tasks (summaries, tags), Claude Sonnet for RAG chat, Claude Opus for complex reasoning.

### Auth
NextAuth with Azure AD provider (`src/app/api/auth/[...nextauth]/route.ts`). Middleware (`src/middleware.ts`) protects all routes except `/login` and `/api/auth/*`. Dev fallback: when Azure AD is not configured, a mock user is injected in `src/lib/auth.ts`.

### Page / Route Structure
```
/               → Dashboard (recent pages, AI quick-ask)
/new            → Create wiki page
/wiki/[slug]    → View wiki page
/wiki/[slug]/edit → Edit wiki page
/wiki/[slug]/history → Revision history with diff viewer
/pages          → Wiki page list (standalone page)
/chat           → AI chat (standalone page, RAG-backed)
/search         → Full-text + semantic search
/tags           → Tag index
/tags/[tag]     → Pages by tag
/settings       → User settings (theme, accent color)
```

### Layout System
`MainLayout` (`src/components/layout/main-layout.tsx`) wraps all authenticated pages. It has a collapsible `LeftSidebar` (nav links), an optional `RightSidebar` (table of contents / backlinks), and a fixed `Header`. Pass `fullHeight={true}` for editor/chat pages that should fill the viewport without scrolling.

### AI Features
- **RAG chat**: `src/lib/ai/rag.ts` + `src/app/api/ai/chat/route.ts` — fetches relevant page chunks from Azure AI Search, passes context to Claude Sonnet.
- **Editor assist**: continue, rewrite, translate actions in `src/components/editor/ai-assist-toolbar.tsx` calling `/api/ai/{continue,rewrite,translate}`.
- **AI summary**: per-page summary cached in `AISummary` model, generated via `/api/pages/[slug]/summary`.
- **Tag suggestions**: `/api/pages/[slug]/suggest-tags` auto-generates tags with GPT.
- Prompts are in `src/lib/ai/prompts.ts`.

### Search
`src/lib/search.ts` + `src/lib/azure/ai-search.ts`. On page save, `src/lib/azure/index-sync.ts` syncs content + embeddings to Azure AI Search. Falls back to Prisma full-text when Azure Search is not configured.

### Data Model Key Points
- `Page` has `slug` (URL key), `content` (Markdown), tags via `PageTag`, revision history via `Revision`, AI summary via `AISummary`.
- `PageLink` tracks wiki-style `[[links]]` between pages (parsed on save).
- `PageView` tracks per-user view history for "recently viewed" dashboard widget.

### Theming
CSS variables in `src/app/globals.css`, switched by `data-theme` and `data-accent` attributes on `<html>`. User preferences persisted in DB (`User.theme`, `User.accentColor`) and synced to `ThemeStore` (Zustand) on login.
