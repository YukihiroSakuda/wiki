# Implementation Plan: Internal LLM-Powered Wiki

## Overview

Internal knowledge base wiki for ~50-300 employees. Combines structured documentation (manuals, procedures) with knowledge sharing (insights, meeting notes). Powered by Azure AI Foundry (GPT-5.4 + Claude 4.6). Next.js 14 App Router, 3-column layout, monochrome + accent color design system.

## Phase Summary

| Phase | Name | Goal |
|-------|------|------|
| 0 | Project Foundation | Next.js init, design system, auth, 3-column layout |
| 1 | Database & Basic CRUD | Prisma schema, page create/view, dashboard, TOC, backlinks |
| 2 | Editor & Preview | Markdown editor + live preview, `[[` autocomplete, tag input |
| 3 | Search, Tags & History | Incremental search, results page, tag pages, revision diff |
| 4 | AI Features (Basic) | AI summary, tag suggestions, editor AI Assist (Continue/Rewrite/Translate) |
| 5 | AI Chat & RAG | Azure AI Search vector search, RAG chat (Claude Sonnet/Opus 4.6) |
| 6 | Responsive & Deploy | Mobile, settings screen, Blob Storage, Azure SQL migration, App Service |

---

## Phase 0: Project Foundation

**Goal:** Next.js project setup, design system, auth flow. On completion: login → empty dashboard works.

### Step 0-1: Initialize Next.js Project
- **Command:** `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- **Files:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`
- **Risk:** Low

### Step 0-2: Install Additional Packages
- **Core:** `zustand`, `prisma`, `@prisma/client`
- **Auth:** `next-auth@4`, `@azure/identity`
- **Markdown:** `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug`
- **AI:** `ai`, `@ai-sdk/azure`
- **Azure:** `@azure/storage-blob`, `@azure/search-documents`
- **UI:** `lucide-react`, `clsx`, `tailwind-merge`
- **Dev:** `@types/node`, `prettier`, `prettier-plugin-tailwindcss`
- **Risk:** Low

### Step 0-3: Design System — Tailwind Config
- **File:** `tailwind.config.ts`
- JetBrains Mono as `fontFamily.mono`
- CSS variable-based color tokens (light/dark)
- Default border-radius: 4px
- 4px spacing grid
- Breakpoints: `sm:768px`, `md:1024px`, `lg:1280px`
- **Risk:** Low

### Step 0-4: Design System — CSS Variables + Global Styles
- **File:** `src/app/globals.css`
- `:root` and `.dark` with color tokens as CSS variables
- `--color-bg-primary`, `--color-bg-surface`, `--color-bg-sidebar`, `--color-border`, `--color-text-primary`, `--color-text-secondary`
- `--color-accent` with default value (overridable by user setting)
- JetBrains Mono Google Fonts import
- Base font-size: 13px
- **Risk:** Low

### Step 0-5: Design System — Base UI Components
- `src/components/ui/button.tsx` — Button (variant: primary/secondary/ghost, size: sm/md)
- `src/components/ui/input.tsx` — Input (text, search)
- `src/components/ui/badge.tsx` — Badge (for tags)
- `src/components/ui/skeleton.tsx` — Skeleton (loading)
- `src/components/ui/dialog.tsx` — Dialog (confirmation)
- `src/components/ui/spinner.tsx` — Spinner (saving state)
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- **Risk:** Low

### Step 0-6: Layout Structure
- `src/app/layout.tsx` — Root layout (font, theme provider, metadata)
- `src/components/layout/header.tsx` — Header (logo, search bar, theme toggle, user avatar)
- `src/components/layout/left-sidebar.tsx` — Left sidebar (navigation, recent pages, tags)
- `src/components/layout/right-sidebar.tsx` — Right sidebar (TOC, backlinks, AI summary)
- `src/components/layout/main-layout.tsx` — 3-column layout wrapper
- Left sidebar: 240px fixed (desktop), collapsible
- Right sidebar: 240px fixed (desktop), Page View only
- **Risk:** Medium (responsive foundation must be designed here)

### Step 0-7: Theme & Accent Color Store
- `src/stores/theme-store.ts` — `{ theme: 'light' | 'dark', accentColor: string, setTheme, setAccentColor }`
- `src/components/providers/theme-provider.tsx` — CSS variable override for accent
- localStorage persistence
- `transition-colors duration-200` for smooth switching
- **Risk:** Low

### Step 0-8: NextAuth.js + Azure Entra ID
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/auth.ts` — Azure AD Provider config
- `src/app/login/page.tsx` — Login screen (Screen 1)
- `src/middleware.ts` — Auth middleware (unauthenticated → `/login`)
- `.env.local` — Environment variable template
- Local dev fallback: Credentials Provider when `NODE_ENV=development`
- **Risk:** Medium (requires Azure AD setup; use Credentials Provider locally)

### Step 0-9: Environment Variables & Config
- `.env.example` — Template for all Azure resource connection strings
- `.gitignore`
- `.prettierrc`
- `src/lib/env.ts` — Environment variable validation and type definitions
- **Risk:** Low

### Phase 0 Verification
- [ ] `npm run dev` starts locally
- [ ] `/login` screen renders
- [ ] Login with local Credentials Provider works
- [ ] After login, empty dashboard (header + left sidebar + main) renders
- [ ] Light/dark theme toggle works
- [ ] Unauthenticated requests redirect to `/login`

---

## Phase 1: Database & Basic CRUD

**Goal:** Prisma schema, basic page create/view/edit flow, dashboard with recent/popular pages.

### Step 1-1: Prisma Schema
- **File:** `prisma/schema.prisma`
- Models: `User`, `Page`, `PageTag`, `Tag`, `Revision`, `PageView`, `AISummary`
- `slug`: unique, auto-generated from title (kebab-case, Japanese-safe)
- `Revision`: snapshot per save (not diff)
- `PageView`: for view count
- Local datasource: `file:./dev.db` (SQLite)
- **Risk:** Low

### Step 1-2: Prisma Client & Seed Data
- `src/lib/prisma.ts` — Singleton client (dev hot reload safe)
- `prisma/seed.ts` — Sample data (5-10 pages, tags, users)
- Commands: `npx prisma migrate dev --name init`, `npx prisma db seed`
- **Risk:** Low

### Step 1-3: Page CRUD API Routes
- `src/app/api/pages/route.ts` — `GET` (list), `POST` (create)
- `src/app/api/pages/[slug]/route.ts` — `GET`, `PUT`, `DELETE`
- `src/lib/slug.ts` — Slug generation (Japanese title support)
- `POST`: accepts title, content, tags; auto-generates slug; creates Revision
- `PUT`: updates content, creates new Revision
- `GET` list: query params `sort=recent|views`, `tag`, `limit`, `offset`
- **Risk:** Medium (slug uniqueness, Japanese support)

### Step 1-4: Dashboard Screen (Screen 2)
- `src/app/(main)/page.tsx`
- `src/app/(main)/layout.tsx` — Authenticated layout (3-column)
- `src/components/dashboard/recently-updated.tsx`
- `src/components/dashboard/frequently-viewed.tsx`
- `src/components/dashboard/ai-quick-ask.tsx` — UI shell only (functional in Phase 5)
- Server Component data fetch, Skeleton support
- **Risk:** Low

### Step 1-5: Page View Screen (Screen 3)
- `src/app/(main)/wiki/[slug]/page.tsx`
- `src/components/page-view/page-header.tsx` — Title, meta, Edit button
- `src/components/page-view/page-content.tsx` — Markdown render (react-markdown + remark-gfm)
- `src/components/page-view/table-of-contents.tsx` — Auto-extract H1-H3, smooth scroll
- `src/components/page-view/backlinks.tsx` — Pages linking to current page
- `src/components/page-view/ai-summary.tsx` — AI summary shell (functional in Phase 4)
- `[[wiki link]]` rendered as custom links
- PageView recorded on visit
- **Risk:** Medium (wiki link parsing)

### Step 1-6: Left Sidebar Data Integration
- Extend `src/components/layout/left-sidebar.tsx`
- NAVIGATE section: recently viewed pages (top 10)
- TAGS section: all tags with page counts
- **Risk:** Low

### Phase 1 Verification
- [ ] SQLite local DB works
- [ ] Seed data creates multiple pages
- [ ] Dashboard shows recently updated and frequently viewed pages
- [ ] Page View renders Markdown correctly
- [ ] TOC and backlinks work
- [ ] `[[wiki link]]` renders as clickable links
- [ ] Left sidebar shows page list and tags

---

## Phase 2: Editor & Preview

**Goal:** Side-by-side Markdown editor + live preview, new page creation and edit flow.

### Step 2-1: Markdown Editor Component
- `src/components/editor/markdown-editor.tsx` — Textarea-based editor
- `src/components/editor/markdown-preview.tsx` — react-markdown preview
- `src/components/editor/editor-layout.tsx` — Side-by-side layout
- 100ms debounce for live preview
- Rough scroll sync between editor and preview
- `[[` triggers wiki link autocomplete
- **Risk:** Medium (autocomplete UX)

### Step 2-2: Wiki Link Autocomplete
- `src/components/editor/wiki-link-autocomplete.tsx`
- `src/app/api/pages/search-titles/route.ts` — Prefix match title search
- 200ms debounce, keyboard navigation (↑↓ + Enter)
- **Risk:** Medium (cursor position detection in textarea)

### Step 2-3: Tag Input Component
- `src/components/editor/tag-input.tsx`
- `src/app/api/tags/route.ts`
- Autocomplete from existing tags, badge display, new tags auto-created
- **Risk:** Low

### Step 2-4: Page Edit Screen (Screen 4)
- `src/app/(main)/wiki/[slug]/edit/page.tsx`
- `src/stores/editor-store.ts` — `{ title, content, tags, isDirty }`
- Left sidebar collapsed in edit mode
- Save → Revision created → navigate to Page View
- Cancel → confirmation dialog if dirty
- **Risk:** Low

### Step 2-5: Page New Screen (Screen 5)
- `src/app/(main)/wiki/new/page.tsx`
- Reuses editor components from Step 2-4
- Title input → auto-generate slug preview
- `[[non-existent page]]` click → navigate here with title pre-filled
- `Ctrl+N` shortcut
- **Risk:** Low

### Step 2-6: Keyboard Shortcuts
- `src/hooks/use-keyboard-shortcuts.ts`
- `Ctrl+K`: focus search bar
- `Ctrl+N`: new page
- `Ctrl+E`: edit current page
- **Risk:** Low

### Phase 2 Verification
- [ ] Side-by-side edit + preview works
- [ ] `[[` triggers page name autocomplete
- [ ] Tags can be added/removed
- [ ] New page create → save → view flow works
- [ ] Edit existing page → save → view flow works
- [ ] Cancel confirmation dialog works
- [ ] Keyboard shortcuts work

---

## Phase 3: Search, Tags & History

**Goal:** Header search, search results, tag pages, revision history. Uses Prisma LIKE locally (Azure AI Search in Phase 5).

### Step 3-1: Search API
- `src/app/api/search/route.ts`
- `src/lib/search.ts` — Abstracted search (local: Prisma LIKE / prod: Azure AI Search)
- Query params: `q`, `mode` (fulltext/semantic), `tag`
- Response: `{ results: [{ page, matchedText, score }], total }`
- **Risk:** Medium (abstraction design)

### Step 3-2: Header Search Bar (Incremental)
- Extend `src/components/layout/search-bar.tsx`
- 300ms debounce, dropdown top 5 results
- Enter → navigate to `/search?q=xxx`
- `Ctrl+K` focus, ESC closes
- **Risk:** Low

### Step 3-3: Search Results Screen (Screen 6)
- `src/app/(main)/search/page.tsx`
- Filter tabs: `[Full-text]` `[Semantic]` `[Tags]` (Semantic inactive until Phase 5)
- Result cards: title, matched text with keyword highlight, tags, date
- Skeleton support
- **Risk:** Low

### Step 3-4: Tags Screen (Screen 7)
- `src/app/(main)/tags/page.tsx`
- Grid of all tags with page counts
- **Risk:** Low

### Step 3-5: Tag Detail Screen (Screen 8)
- `src/app/(main)/tags/[tag]/page.tsx`
- Reuses dashboard card components
- **Risk:** Low

### Step 3-6: Revision History Screen (Screen 9)
- `src/app/(main)/wiki/[slug]/history/page.tsx`
- `src/components/history/revision-list.tsx`
- `src/components/history/diff-viewer.tsx` — Line-level diff (green/red background)
- `src/app/api/pages/[slug]/revisions/route.ts`
- Select 2 revisions to compare diff
- **Risk:** Medium (diff implementation)

### Phase 3 Verification
- [ ] Header incremental search works
- [ ] Search results page shows results
- [ ] Tag list and tag detail pages work
- [ ] Revision history shows past versions
- [ ] Diff between 2 revisions displays correctly

---

## Phase 4: AI Features (Basic)

**Goal:** AI auto-summary, tag suggestions, editor AI Assist (Continue/Rewrite/Translate). Streaming via Vercel AI SDK.

### Step 4-1: AI Foundation Setup
- `src/lib/ai/client.ts` — Azure AI Foundry client (@ai-sdk/azure)
- `src/lib/ai/models.ts` — Model definitions (GPT-5.4-nano, GPT-5.4-mini, Claude Sonnet 4.6, Claude Opus 4.6)
- `src/lib/ai/prompts.ts` — System prompt templates
- Env vars: `AZURE_AI_FOUNDRY_ENDPOINT`, `AZURE_AI_FOUNDRY_API_KEY`
- Local fallback: mock responses when env vars not set
- **Risk:** High (Azure AI Foundry connection, model availability)

### Step 4-2: Auto AI Processing on Save
- `src/app/api/pages/[slug]/summary/route.ts` — GPT-5.4-nano generates 2-3 sentence summary → saved to `AISummary`
- `src/app/api/pages/[slug]/suggest-tags/route.ts` — GPT-5.4-nano suggests 5 tags (matched against existing)
- Save flow: Save → Revision → async AI summary + tag suggestions
- **Risk:** Medium (async error handling)

### Step 4-3: AI Summary in Right Sidebar
- Extend `src/components/page-view/ai-summary.tsx`
- Display from `AISummary` table
- `[Regenerate]` button with streaming + pulsing dot indicator
- Skeleton support
- **Risk:** Low

### Step 4-4: Editor AI Assist Toolbar
- `src/components/editor/ai-assist-toolbar.tsx` — Floating toolbar on text selection
- `src/app/api/ai/continue/route.ts` — GPT-5.4-mini, streaming
- `src/app/api/ai/rewrite/route.ts` — GPT-5.4-mini, streaming
- `src/app/api/ai/translate/route.ts` — GPT-5.4-mini, language selector (EN/JA/ZH), streaming
- All APIs use Vercel AI SDK `streamText`
- **Risk:** High (floating UI positioning, streaming text insertion UX)

### Step 4-5: AI Assist Diff View
- `src/components/editor/ai-diff-view.tsx`
- Rewrite result shown inline (deletions: red strikethrough, additions: green)
- `[Accept]` replaces original, `[Reject]` restores original
- **Risk:** Medium

### Phase 4 Verification
- [ ] AI summary auto-generates on page save
- [ ] Right sidebar shows AI summary
- [ ] Regenerate works with streaming
- [ ] AI Assist toolbar appears on text selection
- [ ] Continue / Rewrite / Translate stream correctly
- [ ] Rewrite diff + Accept/Reject works
- [ ] Graceful degradation when AI not connected (local)

---

## Phase 5: AI Chat & RAG

**Goal:** Azure AI Search vector search, RAG-based AI Chat using Claude Sonnet/Opus 4.6.

### Step 5-1: Azure AI Search Integration
- `src/lib/azure/ai-search.ts` — Client (index ops, search)
- `src/lib/azure/embeddings.ts` — Azure OpenAI Embeddings client
- Index definition: `wiki-pages` (title, content, tags, vector)
- On page save: generate embedding → update index
- Hybrid search (full-text + vector)
- Extend `src/lib/search.ts` abstraction with Azure AI Search implementation
- **Risk:** High (Azure AI Search config, index definition)

### Step 5-2: Semantic Search in Results Screen
- Activate `[Semantic]` tab in search results
- Vector similarity ranking
- **Risk:** Low

### Step 5-3: AI Chat Panel UI
- `src/components/ai-chat/chat-panel.tsx` — Slide-in from right (300ms)
- `src/components/ai-chat/chat-message.tsx` — Message bubbles (user/assistant)
- `src/components/ai-chat/chat-input.tsx`
- `src/components/ai-chat/chat-sources.tsx` — Source page links
- `src/components/ai-chat/chat-fab.tsx` — Floating action button (bottom right)
- `src/stores/chat-store.ts` — `{ messages, isOpen }` persisted across navigation
- Click outside → close panel
- **Risk:** Medium (animation, z-index management)

### Step 5-4: AI Chat API (RAG)
- `src/app/api/ai/chat/route.ts` — Streaming chat API
- `src/lib/ai/rag.ts` — RAG pipeline (search → context build → LLM call)
- Question → Azure AI Search vector search → inject context into system prompt
- Claude Sonnet 4.6 for responses (streaming)
- Auto-escalate to Claude Opus 4.6 for complex queries (token count / complexity heuristic)
- Response includes source pages (name + slug)
- **Risk:** High (RAG quality, model switching logic)

### Step 5-5: Dashboard AI Quick Ask Integration
- Extend `src/components/dashboard/ai-quick-ask.tsx`
- Input → open AI Chat panel → send message
- **Risk:** Low

### Phase 5 Verification
- [ ] Vector index updates on page save
- [ ] Semantic search works
- [ ] AI Chat panel slides in
- [ ] RAG responses stream with source links
- [ ] Conversation history persists across navigation
- [ ] AI Quick Ask opens chat panel

---

## Phase 6: Responsive, Settings & Deploy

**Goal:** Mobile support, settings screen, file upload, Azure SQL migration, App Service deployment.

### Step 6-1: Settings Screen (Screen 10)
- `src/app/(main)/settings/page.tsx`
- `src/components/settings/accent-color-picker.tsx` — All Tailwind colors except gray
- `src/components/settings/theme-toggle.tsx`
- `src/app/api/users/settings/route.ts`
- Color selection updates CSS variable immediately + persists to DB
- **Risk:** Low

### Step 6-2: Responsive Adaptations
- Extend all layout/component files from Phase 0-5
- **Tablet (768-1023px):** Left sidebar as drawer, right sidebar collapsible
- **Mobile (~767px):**
  - Left sidebar → hamburger menu drawer
  - Right sidebar → accordion below content (TOC / Backlinks / AI Summary)
  - Editor → tab switch (Edit / Preview)
  - AI Chat → full-screen modal
  - Search → icon tap to expand
  - Touch targets minimum 44x44px
- **Risk:** Medium (refactor volume)

### Step 6-3: Azure Blob Storage File Upload
- `src/lib/azure/blob-storage.ts`
- `src/app/api/upload/route.ts`
- `src/components/editor/file-upload.tsx` — Drag & drop in editor
- On upload: save to Blob Storage → insert `![alt](blob-url)` in Markdown
- File size limit: 10MB
- Local dev fallback: local filesystem
- **Risk:** Medium (Azure Blob auth config)

### Step 6-4: Performance Optimization
- Next.js ISR consideration for high-traffic pages
- Prisma query optimization (N+1, `include` tuning)
- Search caching strategy
- JetBrains Mono via `next/font`
- `next/image` for Blob Storage URLs
- Bundle analysis + code splitting
- **Risk:** Low

### Step 6-5: Azure SQL Database Migration
- Update `prisma/schema.prisma` datasource to `sqlserver` (env-based switch)
- Local: `sqlite`, production: `sqlserver`
- Run migrations against Azure SQL Database
- Connection pooling config
- **Risk:** High (SQLite → SQL Server compatibility)

### Step 6-6: Azure App Service Deployment
- `Dockerfile` — Multi-stage build
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `next.config.js` — `output: 'standalone'`
- Deploy to Azure App Service (Linux)
- Environment variables via Azure Portal or Key Vault
- Health check endpoint
- **Risk:** Medium

### Phase 6 Verification
- [ ] Accent color change reflects immediately in settings
- [ ] Mobile drawer, tab switch, accordion work correctly
- [ ] Drag & drop image upload works
- [ ] All features work with Azure SQL Database
- [ ] App deployed to Azure App Service with Entra ID login
- [ ] Lighthouse: Performance 80+, Accessibility 90+

---

## File Structure (Final)

```
D:\my-app\wiki\
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── wiki/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx            # Page View
│   │   │   │       ├── edit/page.tsx       # Page Edit
│   │   │   │       └── history/page.tsx    # History
│   │   │   ├── search/page.tsx
│   │   │   ├── tags/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [tag]/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── pages/
│   │       │   ├── route.ts
│   │       │   ├── search-titles/route.ts
│   │       │   └── [slug]/
│   │       │       ├── route.ts
│   │       │       ├── revisions/route.ts
│   │       │       ├── summary/route.ts
│   │       │       └── suggest-tags/route.ts
│   │       ├── search/route.ts
│   │       ├── tags/route.ts
│   │       ├── upload/route.ts
│   │       ├── users/settings/route.ts
│   │       └── ai/
│   │           ├── chat/route.ts
│   │           ├── continue/route.ts
│   │           ├── rewrite/route.ts
│   │           └── translate/route.ts
│   ├── components/
│   │   ├── ui/                             # Design System primitives
│   │   ├── layout/                         # Header, Sidebars, MainLayout
│   │   ├── providers/                      # ThemeProvider
│   │   ├── dashboard/
│   │   ├── page-view/
│   │   ├── editor/
│   │   ├── history/
│   │   ├── ai-chat/
│   │   └── settings/
│   ├── stores/
│   │   ├── theme-store.ts
│   │   ├── editor-store.ts
│   │   └── chat-store.ts
│   ├── hooks/
│   │   └── use-keyboard-shortcuts.ts
│   └── lib/
│       ├── utils.ts
│       ├── prisma.ts
│       ├── auth.ts
│       ├── env.ts
│       ├── slug.ts
│       ├── search.ts
│       ├── ai/
│       │   ├── client.ts
│       │   ├── models.ts
│       │   ├── prompts.ts
│       │   └── rag.ts
│       └── azure/
│           ├── ai-search.ts
│           ├── embeddings.ts
│           └── blob-storage.ts
├── .env.example
├── .env.local
├── .gitignore
├── .prettierrc
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Azure AI Foundry model availability / rate limits | High | Local mock responses, fallback model, retry + exponential backoff |
| SQLite → Azure SQL Server compatibility | High | Test with SQL Server early, document Prisma differences |
| Floating AI Assist toolbar positioning | Medium | `getSelection()` + `getBoundingClientRect()`, consider `@floating-ui/react` |
| Azure AI Search index schema changes | Medium | Careful initial design, document migration procedure |
| RAG answer quality | Medium | Chunk strategy tuning, reranking consideration, iterative prompt improvement |
| 3-column → 1-column responsive conversion | Medium | Design responsive foundation in Phase 0, finalize in Phase 6 |

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Slug generation, diff calculation, search query building, prompt generation |
| Component | Vitest + Testing Library | UI components, editor, search bar |
| API | Vitest | Each API Route (mock DB) |
| E2E | Playwright | Login → create page → edit → search → AI Chat flow |
| Manual | — | AI feature quality, responsive display |
