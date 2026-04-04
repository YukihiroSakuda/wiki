# UI/UX Design: Internal Wiki with LLM

## Overview

Internal knowledge base wiki for ~50-300 employees. Combines structured documentation (manuals, procedures) with knowledge sharing (insights, meeting notes). Powered by Azure AI Foundry (GPT-5.4 + Claude 4.6) for AI features.

## Design Principles

- Structural, high information density
- Monochrome base + single user-selectable accent color
- Small border radius (4px)
- Modern, techy aesthetic
- Monospace font (JetBrains Mono)
- UI text in English
- Non-generic, distinctive design

## Design System

### Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-primary` | `gray-50` (#F9FAFB) | `gray-950` (#030712) | Page background |
| `bg-surface` | `white` (#FFFFFF) | `gray-900` (#111827) | Cards, panels |
| `bg-sidebar` | `gray-100` (#F3F4F6) | `gray-900` (#111827) | Sidebars |
| `border` | `gray-200` (#E5E7EB) | `gray-800` (#1F2937) | Borders |
| `text-primary` | `gray-900` (#111827) | `gray-50` (#F9FAFB) | Body text |
| `text-secondary` | `gray-500` (#6B7280) | `gray-400` (#9CA3AF) | Secondary text |
| `accent` | User-selected | User-selected | Links, buttons, selection |

- Accent color: any Tailwind color except gray. User-configurable in Settings.
- Theme: light/dark toggle. Default is light mode.

### Typography

| Usage | Font | Size |
|-------|------|------|
| UI (all) | JetBrains Mono | 13px |
| Headings | JetBrains Mono Bold | 18-24px |
| Markdown body | JetBrains Mono | 14px |
| Code blocks | JetBrains Mono | 13px |

### Border Radius / Spacing

- Border radius: `rounded` (4px) across all elements
- Border: 1px solid
- Spacing: 4px grid (4, 8, 12, 16, 24, 32)

### Icons

- Lucide Icons (monoline, consistent, techy)

## Page Structure

- Flat structure (no folder hierarchy)
- Organized by tags and `[[wiki links]]`
- All users can edit all pages (no role-based restrictions)

## Screens

### Screen List

| # | Screen | Path | Description |
|---|--------|------|-------------|
| 1 | Login | `/login` | Azure Entra ID SSO |
| 2 | Dashboard | `/` | Recently updated, frequently viewed, AI Quick Ask |
| 3 | Page View | `/wiki/:slug` | 3-column page display |
| 4 | Page Edit | `/wiki/:slug/edit` | Markdown editor + live preview |
| 5 | Page New | `/wiki/new` | New page creation |
| 6 | Search Results | `/search?q=xxx` | Full-text + semantic search results |
| 7 | Tags | `/tags` | Tag list |
| 8 | Tag Detail | `/tags/:tag` | Pages filtered by tag |
| 9 | History | `/wiki/:slug/history` | Revision history with diff |
| 10 | Settings | `/settings` | Accent color, theme toggle |

### Screen Flow

```
Login --> Dashboard
              |
              +--> Page View --> Page Edit
              |        |
              |        +--> History
              |        +--> AI Chat (side panel)
              |
              +--> Page New
              |
              +--> Search Results --> Page View
              |
              +--> Tags --> Tag Detail --> Page View
              |
              +--> Settings

* Header Search bar: available on all screens
* Left Sidebar: available on all screens (except Login)
* AI Chat side panel: accessible from all screens
```

## Screen Layouts

### Dashboard (`/`)

```
+----------------------------------------------------------+
| Header                                                    |
|  [=]  WIKI TITLE    [Search............] [O] [*] [User]  |
+----------+-----------------------------------------------+
| Left     | Main                                          |
| Sidebar  |                                               |
|          | +-- Recently Updated ------------------------+|
| NAVIGATE | | Page Title    tag1 tag2    2h ago           ||
| +------+ | | Page Title    tag1        1d ago           ||
| |recent| | | Page Title    tag3        3d ago           ||
| |pages | | +--------------------------------------------+|
| |...   | |                                               |
| +------+ | +-- Frequently Viewed ----------------------+|
|          | | Page Title    12 views                      ||
| TAGS     | | Page Title     8 views                      ||
| +------+ | +--------------------------------------------+|
| |tag1  | |                                               |
| |tag2  | | +-- AI Quick Ask ----------------------------+|
| |tag3  | | | [Ask anything about this wiki...]          ||
| |...   | | +--------------------------------------------+|
| +------+ |                                               |
+----------+-----------------------------------------------+
```

### Page View (`/wiki/:slug`) -- 3-Column

```
+----------------------------------------------------------+
| Header                                                    |
+----------+-----------------------------+-----------------+
| Left     | Main                        | Right Sidebar   |
| Sidebar  |                             |                 |
|          | Page Title          [Edit]  | TABLE OF        |
| NAVIGATE | updated: 2026-04-01         | CONTENTS        |
| +------+ | author: tanaka              | +-------------+ |
| |recent| | tags: [api] [backend]       | | # Heading 1 | |
| |pages | |                             | |  ## Sub 1   | |
| |...   | | -------------------------   | |  ## Sub 2   | |
| +------+ |                             | | # Heading 2 | |
|          | Markdown rendered content   | +-------------+ |
| TAGS     | ...                         |                 |
| +------+ | ...                         | BACKLINKS       |
| |tag1  | | ...                         | +-------------+ |
| |tag2  | |                             | | [[Page A]]  | |
| |...   | |                             | | [[Page B]]  | |
| +------+ |                             | +-------------+ |
|          |                             |                 |
|          |                             | AI SUMMARY      |
|          |                             | +-------------+ |
|          |                             | | This page...| |
|          |                             | +-------------+ |
+----------+-----------------------------+-----------------+
```

### Page Edit (`/wiki/:slug/edit`)

```
+----------------------------------------------------------+
| Header                                                    |
+----------+-----------------------------------------------+
| Left     | Main                                          |
| Sidebar  |                                               |
|          | Title: [...............................]       |
| (collaps | Tags: [api] [backend] [+ Add]                 |
|  ed on   |                                               |
|  edit)   | +-- Editor -----------+-- Preview -----------+|
|          | |                     |                       ||
|          | | # Heading           | Heading               ||
|          | |                     |                       ||
|          | | Some text with      | Some text with        ||
|          | | [[Page Link]]       | Page Link (linked)    ||
|          | |                     |                       ||
|          | | ```code```          | code (highlighted)    ||
|          | |                     |                       ||
|          | +---------------------+-----------------------+|
|          |                                               |
|          | +-- AI Assist (inline) ----------------------+|
|          | | [Continue] [Rewrite] [Translate] [Suggest]  ||
|          | +--------------------------------------------+|
|          |                          [Cancel]  [Save]     |
+----------+-----------------------------------------------+
```

- Side-by-side editor and preview
- AI Assist toolbar appears floating on text selection
- Left sidebar collapses to maximize editor area

### Search Results (`/search?q=xxx`)

```
+----------------------------------------------------------+
| Header                                                    |
|  [=]  WIKI TITLE    [Search: "deploy"] [O] [*] [User]   |
+----------+-----------------------------------------------+
| Left     | Main                                          |
| Sidebar  |                                               |
|          | Results for "deploy"              12 results  |
|          | [Full-text v] [Semantic v] [Tags v]           |
|          |                                               |
|          | +--------------------------------------------+|
|          | | Deploy Guide                               ||
|          | | ...matched text with **deploy** highlighted||
|          | | [backend] [ops]           2026-03-28       ||
|          | +--------------------------------------------+|
|          | | CI/CD Pipeline Setup                       ||
|          | | ...matched text with **deploy** highlighted||
|          | | [devops]                  2026-03-15       ||
|          | +--------------------------------------------+|
+----------+-----------------------------------------------+
```

## Interactions

### Global

| Action | Behavior |
|--------|----------|
| `Ctrl+K` | Focus search bar (command palette style) |
| `Ctrl+N` | Navigate to new page |
| `Ctrl+E` | Navigate to edit current page |
| Header Search input | 300ms debounce, incremental search, dropdown with top 5 |
| Theme toggle `[O]` | Instant light/dark switch, `transition-colors duration-200` |
| Left Sidebar `[=]` | Collapse/expand toggle |

### Page View

| Action | Behavior |
|--------|----------|
| `[[Page Link]]` click | Navigate to page. If not exists, go to new page with title pre-filled |
| TOC heading click | Smooth scroll to heading |
| Tag badge click | Navigate to Tag Detail |
| `[Edit]` button | Navigate to edit |
| AI Summary `[Regenerate]` | Re-generate summary via LLM, skeleton during streaming |

### Page Edit

| Action | Behavior |
|--------|----------|
| Markdown input | Real-time preview update (100ms debounce) |
| `[[` input | Autocomplete dropdown with page name suggestions |
| Text selection | Floating AI Assist toolbar appears above selection |
| AI `[Continue]` | LLM continues text after selection (streaming) |
| AI `[Rewrite]` | LLM rewrites selected text (diff highlight, Accept/Reject) |
| AI `[Translate]` | Translate selected text to specified language (streaming) |
| AI `[Suggest]` | Auto-suggest tags (apply on check) |
| `[Save]` | Save -> create revision -> auto-generate AI summary -> auto-suggest tags -> navigate to Page View |
| `[Cancel]` | Confirmation dialog if unsaved changes exist |

### Search

| Action | Behavior |
|--------|----------|
| Header Search input | Dropdown with top 5 results instantly |
| `Enter` | Navigate to Search Results (full list) |
| Filter tab toggle | Switch between Full-text / Semantic search mode |
| Result click | Navigate to Page View |

### AI Chat Panel

| Action | Behavior |
|--------|----------|
| Floating button click | Slide-in from right (300ms) |
| Submit question | Streaming response with Sources (linked page names) |
| Source link click | Open referenced page |
| Click outside panel | Close panel |
| Conversation history | Persisted during session, maintained across page navigation |

### Loading & Feedback

| State | Display |
|-------|---------|
| Page loading | Skeleton screen (text line placeholders) |
| AI generating | Streaming text + pulsing dot indicator |
| Saving | Spinner on Save button + disabled |
| Searching | Skeleton in results area |
| Error | Inline error message near the problem (no toast) |

## Responsive Design

### Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Desktop | 1280px+ | 3-column (left 240px / main / right 240px) |
| Laptop | 1024-1279px | 2-column (left 200px / main), right sidebar collapsible |
| Tablet | 768-1023px | 1-column, left sidebar as drawer |
| Mobile | ~767px | 1-column, sidebar as drawer, editor as tab switch |

### Mobile Adaptations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Left Sidebar | Always visible | Hamburger menu drawer |
| Right Sidebar | Always visible | Accordion below page content (TOC / Backlinks / AI Summary) |
| Editor | Side-by-side (Editor + Preview) | Tab switch (Edit / Preview) |
| AI Chat | Right slide-in panel | Full-screen modal |
| Search | Inline input in header | Search icon tap to expand |
| Touch targets | - | Minimum 44x44px |

## AI Features Summary

| Feature | Model | Trigger |
|---------|-------|---------|
| Page summary | GPT-5.4-nano | Auto on save, manual regenerate |
| Auto-tag suggestion | GPT-5.4-nano | Auto on save |
| Continue writing | GPT-5.4-mini | Text selection + [Continue] |
| Rewrite | GPT-5.4-mini | Text selection + [Rewrite] |
| Translate | GPT-5.4-mini | Text selection + [Translate] |
| Wiki Q&A (RAG) | Claude Sonnet 4.6 | AI Chat panel |
| Complex analysis | Claude Opus 4.6 | AI Chat (auto-escalation for complex queries) |
| Vector embeddings | Azure OpenAI Embeddings | Auto on save |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Editor | Markdown textarea + react-markdown + remark-gfm |
| Database | Azure SQL Database |
| ORM | Prisma |
| Search | Azure AI Search (full-text + vector) |
| File storage | Azure Blob Storage |
| LLM | Azure AI Foundry (GPT-5.4, Claude 4.6) |
| AI SDK | Vercel AI SDK |
| Auth | NextAuth.js + Azure Entra ID |
| Icons | Lucide Icons |
| Font | JetBrains Mono (Google Fonts) |
| Hosting | Azure App Service |
