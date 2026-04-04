import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { streamText } from "ai";

const SUPPORTED_LANGS: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  de: "German",
  fr: "French",
  es: "Spanish",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { selectedText, targetLang } = await req.json();
  const langName = SUPPORTED_LANGS[targetLang] ?? targetLang ?? "Japanese";

  if (!IS_AI_CONFIGURED) {
    return new Response(`[Translation to ${langName} — AI not configured]\n${selectedText}`, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const azure = getAzureClient()!;

  const result = streamText({
    model: azure(MODELS.GPT_ASSIST),
    prompt: PROMPTS.translate(selectedText, langName),
    maxOutputTokens: 800,
  });

  return result.toTextStreamResponse();
}
