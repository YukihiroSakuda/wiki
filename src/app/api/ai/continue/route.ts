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

  const { selectedText, pageTitle } = await req.json();

  if (!IS_AI_CONFIGURED) {
    const mock = ` This section can be expanded further with additional details and examples.`;
    return new Response(mock, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const azure = getAzureClient()!;

  const result = streamText({
    model: azure(MODELS.GPT_ASSIST),
    prompt: PROMPTS.continueWriting(selectedText, pageTitle ?? ""),
    maxOutputTokens: 300,
  });

  return result.toTextStreamResponse();
}
