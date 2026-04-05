import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { title, content } = await req.json();

  if (!IS_AI_CONFIGURED) {
    return NextResponse.json(buildMock(title ?? "", content ?? ""));
  }

  const azure = getAzureClient()!;

  const { text } = await generateText({
    model: azure(MODELS.GPT_FAST),
    prompt: PROMPTS.proofread(title ?? "", content ?? ""),
    maxOutputTokens: 8000,
  });

  // Parse JSON response — strip any accidental markdown fences
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed: { title: string; content: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: text }, { status: 502 });
  }

  return NextResponse.json({ title: parsed.title ?? title, content: parsed.content ?? content });
}

// ─── Mock for UI testing (Azure AI not configured) ───────────────────────────
// When the editor has real content, applies deterministic substitutions so the
// diff viewer shows realistic changes.
// When the editor is empty/short, returns a fixed before/after sample pair so
// every diff type (added, removed, changed with inline char highlights) can be
// verified without typing anything first.

interface MockResult {
  title: string;
  content: string;
  /** Shown as the "before" in the diff when the editor was empty. */
  originalTitle?: string;
  originalContent?: string;
}

function buildMock(title: string, content: string): MockResult {
  // ── When editor is empty — return a fully canned before/after pair ──
  if (content.trim().length < 10) {
    const originalTitle = title.trim() || "認証機能について";
    const originalContent = [
      "##認証機能の概要",
      "",
      "このシステムではAzure Entra IDを使って認証を行なう。",
      "ユーザーはMicrosoftアカウントでログイン出来る。",
      "",
      "##セットアップ手順",
      "",
      "1. Azure ポータルでアプリ登録の設定を行う。",
      "2. クライアントIDとシークレットを取得する事が必要。",
      "3. `.env.local` に以下の様に設定する。",
      "",
      "```",
      "AZURE_AD_CLIENT_ID=your-client-id",
      "AZURE_AD_CLIENT_SECRET=your-secret  ",
      "AZURE_AD_TENANT_ID=your-tenant-id",
      "```",
      "",
      "4. アプリを再起動して動作の確認を行う。",
      "",
      "##注意事項",
      "",
      "シークレットの有効期限に注意する事。",
      "期限切れの場合はログインが出来なくなる為に注意してください。",
    ].join("\n");

    const newTitle = "Azure Entra ID 認証 — 概要とセットアップ手順";
    const newContent = [
      "## 認証機能の概要",
      "",
      "このシステムでは Azure Entra ID を使って認証する。",
      "ユーザーは Microsoft アカウントでログインできる。",
      "",
      "## セットアップ手順",
      "",
      "1. Azure ポータルでアプリ登録を設定する。",
      "2. クライアント ID とシークレットを取得することが必要。",
      "3. `.env.local` に以下のように設定する。",
      "",
      "```",
      "AZURE_AD_CLIENT_ID=your-client-id",
      "AZURE_AD_CLIENT_SECRET=your-secret",
      "AZURE_AD_TENANT_ID=your-tenant-id",
      "```",
      "",
      "4. アプリを再起動して動作を確認する。",
      "",
      "## 注意事項",
      "",
      "シークレットの有効期限に注意すること。",
      "期限切れの場合はログインできなくなるため注意してください。",
    ].join("\n");

    return {
      title: newTitle,
      content: newContent,
      originalTitle,
      originalContent,
    };
  }

  // ── When editor has real content — apply deterministic substitutions ──
  const newTitle =
    title.length > 0 && title.length < 20
      ? title + " — 概要と手順"
      : title.replace(/について$/, "の詳細ガイド").replace(/メモ$/, "ノート");

  let c = content;
  c = c.replace(/設定を行う/g, "設定する");
  c = c.replace(/確認を行う/g, "確認する");
  c = c.replace(/実装を行う/g, "実装する");
  c = c.replace(/行なう/g, "行う");
  c = c.replace(/出来る/g, "できる");
  c = c.replace(/事が/g, "ことが");
  c = c.replace(/事。/g, "こと。");
  c = c.replace(/様に/g, "ように");
  c = c.replace(/為に/g, "ために");
  c = c.replace(/どの様な/g, "どのような");
  c = c.replace(/^(#{1,6})([^\s#])/gm, "$1 $2"); // heading spacing
  c = c.replace(/[ \t]+$/gm, ""); // trailing whitespace
  c = c.replace(/\n{4,}/g, "\n\n\n"); // excess blank lines

  if (c === content) {
    c = c.trimEnd() + "\n\n> **校正メモ（モック）:** 明確な修正箇所は見つかりませんでした。";
  }

  return { title: newTitle || title, content: c };
}
