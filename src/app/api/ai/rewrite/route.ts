import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { streamText } from "ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { selectedText, instruction } = await req.json();

  if (!IS_AI_CONFIGURED) {
    return new Response(selectedText + " [rewritten — AI not configured]", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const azure = getAzureClient()!;

  const result = streamText({
    model: azure(MODELS.GPT_ASSIST),
    prompt: PROMPTS.rewrite(selectedText, instruction ?? ""),
    maxOutputTokens: 500,
  });

  return result.toTextStreamResponse();
}
