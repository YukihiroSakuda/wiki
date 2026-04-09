import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { IS_AI_CONFIGURED } from "@/lib/ai/client";
import { type UIMessage } from "ai";
import { streamAgenticChat } from "@/lib/ai/agentic-rag";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new Response("No user message", { status: 400 });
  }

  if (!IS_AI_CONFIGURED) {
    // Mock plain-text response for local dev
    const lastText =
      lastUser.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") || "your question";
    const mockText =
      `I found relevant page(s) for your query about "${lastText}".\n\n` +
      "Please configure Azure AI Foundry to get real AI-powered answers with agentic search.";
    return new Response(mockText, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const result = await streamAgenticChat({
    messages,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
