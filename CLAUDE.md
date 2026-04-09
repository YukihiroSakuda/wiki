# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Next.js on port 3000)
npm run build        # Production build
npm run start        # Start production server
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
- **Vercel AI SDK v6** (`ai` package) with `@ai-sdk/azure` adapter — all LLM calls go through `src/lib/ai/client.ts` (`getAzureClient()`).
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

### File Attachment & Extraction
`src/lib/file-extractor.ts` + `src/lib/file-to-images.ts`. Supported: PDF, Word, Excel, PowerPoint, images. All types are converted to images via `@napi-rs/canvas` (PDF page rendering) or `adm-zip` (Office embedded images), then fed to GPT Vision (`MODELS.GPT_FAST`) for Markdown extraction. Upload endpoint: `/api/upload` (Azure Blob) → extraction endpoint: `/api/extract-file`. Editor component: `src/components/editor/file-upload.tsx`.

### Theming
CSS variables in `src/app/globals.css`, switched by `data-theme` and `data-accent` attributes on `<html>`. User preferences persisted in DB (`User.theme`, `User.accentColor`) and synced to `ThemeStore` (Zustand) on login.

---

## デザインシステム — Terminal OS

このアプリは **Terminal OS** デザイン言語に従っている。ターミナルエミュレータやコードエディタからインスパイアされた開発者ツール的な美学。ダークモードが主体であり、ライトモードはクリーンで低コントラストなバリアントとして提供する。

### コアコンセプト

- **等幅フォント統一。** JetBrains Mono が唯一のフォント。すべてのテキストに `font-mono` を適用すること。sans-serif / serif は使用禁止。
- **フラット＋ボーダー。** カードに `box-shadow` は付けない（モーダル・ポップオーバーは除く）。構造はボーダーで表現する。コンテナには必ず `rounded`（4px）を使う。`rounded-lg` や `rounded-full` はパネルに使わない。
- **アクセントは意味を持つ色として使う。** アクセントカラー（ダーク: mint `#00E5A0` / ライト: `#00A676`）はフォーカス・アクティブ状態・主要CTA・重要ハイライトにのみ使用する。装飾目的での多用は避ける。
- **装飾より控えめさ。** 背景はダークモードでは黒に近く、ライトモードでは白に近い。レイヤー間のコントラストは極めて低い。`body` のアンビエントグリッドがノイズなしに奥行きを演出する。
- **UI テキストは英語統一。** ボタンラベル・プレースホルダー・トーストメッセージ・エラーテキストなど、すべての UI 上の文字は英語で記述する。

### カラートークン

CSS 変数を必ず使うこと — **Tailwind のハードコードカラークラス**（`text-red-500`、`bg-green-50` など）は**絶対に使わない**。

| トークン | 用途 |
|---|---|
| `--color-bg-primary` | ページ基底背景 |
| `--color-bg-surface` | カード・パネル・モーダル |
| `--color-bg-secondary` | 内側のサブパネル・フォームフィールド |
| `--color-bg-sidebar` | サイドバー・スティッキーヘッダー |
| `--color-bg-elevated` | モーダル・ポップオーバー（最上位レイヤー） |
| `--color-bg-hover` | 行・アイテムのホバー背景 |
| `--color-border` | すべてのコンテナのデフォルトボーダー |
| `--color-border-strong` | 強調ボーダー（アクティブアイテム・入力欄） |
| `--color-text-primary` | 本文・見出し |
| `--color-text-secondary` | 補足テキスト・メタデータ |
| `--color-text-muted` | ラベル・セクションヘッダー・プレースホルダー |
| `--color-text-dim` | タイムスタンプ・ヒント・無効テキスト |
| `--color-accent` | 主要 CTA・フォーカスリング・アクティブハイライト |
| `--color-accent-hover` | ホバー時のアクセント |
| `--color-accent-glow` | アクセント要素のグロー影 |
| `--color-success` | 確定・ベストアンサー・diff 追加行 |
| `--color-warning` | 注意状態・確認待ち |
| `--color-danger` | エラー・削除アクション・diff 削除行 |
| `--color-info` | 情報バッジ |

**透過修飾子によるティント背景：** `bg-[var(--color-danger)]/10`、`border-[var(--color-success)]/40` のように使う。セマンティックカラーを不透明な塗り色として使わない。

### タイポグラフィ

- 基準フォントサイズ: `13px`（`html` に設定済み）。Tailwind の `text-sm` はこのスケールで 13px になる。
- デフォルト: `font-mono text-sm`。メタデータ・ラベルは `text-xs`、入力値は `text-base`、ページタイトルは `text-xl` / `text-2xl`。
- セクションラベル: `font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]`
- ページタイトル (h1): `font-mono text-xl font-bold tracking-tight text-[var(--color-text-primary)]`

### UI コンポーネント

**インラインスタイルより共通コンポーネントを優先すること。**

#### Button (`src/components/ui/button.tsx`)

| バリアント | 用途 |
|---|---|
| `primary` | 主要 CTA（save / post / send）。アクセントグロー＋ホバー時リフト。 |
| `secondary` | 標準アクションボタン。ニュートラルなボーダー＋サーフェス背景。 |
| `ghost` | 低強調アクション（cancel / dismiss）。ボーダー・背景なし。 |
| `danger` | 破壊的アクション（delete / clear）。`--color-danger` 使用。 |
| `success` | 肯定的な確認（confirm best answer 等）。`--color-success` 使用。 |

サイズ: `xs`（カード内インラインアクション）、`sm`（ツールバー・ヘッダーボタン）、`md`（フォーム送信）、`lg`（目立つ CTA）。

Button バリアントで対応できるケースに、パディング・ボーダー・カラークラスを個別に指定した生の `<button>` 要素を**書かない**こと。

#### Input (`src/components/ui/input.tsx`)

すべての一行テキスト入力に `<Input>` を使う。高さ・フォーカスリング・プレースホルダー色が統一されている。`className` は幅・マージン調整のみに使う。

#### Textarea (`src/components/ui/textarea.tsx`)

すべての複数行テキスト入力に `<Textarea>` を使う。Input と同じスタイル（`bg-[var(--color-bg-secondary)]`・ボーダー・フォーカスリング）。

#### Badge (`src/components/ui/badge.tsx`)

タグ・ステータスチップに使う。`removable` プロップでホバー時に × ボタンが現れる。

### インタラクティブ状態

- **フォーカス:** `globals.css` でグローバル定義済み — `outline: 1px solid var(--color-accent)` + `box-shadow: 0 0 0 3px var(--color-accent-glow)`。`:focus-visible` スタイルを上書きしないこと。
- **ホバー（テキストボタン）:** ナビリンクは `hover:text-[var(--color-accent)]`、ミュート→プライマリへの遷移は `hover:text-[var(--color-text-primary)]`。
- **ホバー（アイコンボタン）:** `rounded p-1` のラッパーに `hover:bg-[var(--color-bg-hover)]`。
- **無効状態:** Button コンポーネントが `disabled:opacity-60 disabled:grayscale` で処理済み。インラインボタンも合わせて `disabled:opacity-60` にすること。
- **トランジション:** `globals.css` の `*` ルールで `transition-colors duration-150` がグローバルに適用済み。個別に重複指定しない。

### Diff / ステータスカラー

差分ビュー（追加・削除行）やステータス表示に使うパターン:
- 追加 / 成功: `bg-[var(--color-success)]/10 text-[var(--color-success)]`
- 削除 / エラー: `bg-[var(--color-danger)]/10 text-[var(--color-danger)]`
- インライン文字差分の背景: `bg-[var(--color-success)]/20` / `bg-[var(--color-danger)]/20`

### レイアウトパターン

- **カード:** `rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)]` — `box-shadow` は付けない。
- **モーダル / ダイアログ:** `rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl` + `fixed inset-0 bg-black/40` のバックドロップ。
- **カード内セクションヘッダー:** `border-b border-[var(--color-border)] px-4 py-2.5` + 上記のラベルパターン。
- **スペーシング:** リストアイテム間は `gap-3` / `gap-4`、主要セクション間は `space-y-5`、カードボディは `px-4 py-4` を基本とする。
- **ページコンテンツは画面幅いっぱいに広げる。** `MainLayout` 内のページ最上位ラッパーに `max-w-*` を付けない。サイドバーが占有した残りの幅を全て使う。例外: ログインフォーム・モーダル・コマンドパレット・チャットバブルなど、機能上幅を制限すべき UI 要素はこの限りでない。
