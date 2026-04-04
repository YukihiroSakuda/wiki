import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { buildRagContext, shouldUseOpus } from "@/lib/ai/rag";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: IncomingMessage[] } = await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new Response("No user message", { status: 400 });
  }

  // Build RAG context
  const { contextText, sources } = await buildRagContext(lastUser.content);

  const systemPrompt = `You are a helpful assistant for an internal company wiki.
Answer questions based on the wiki content provided below. Be concise and factual.
If the answer is not in the provided context, say so clearly.
Use markdown formatting where appropriate.

${contextText ? `## Wiki Context\n\n${contextText}` : "No relevant wiki pages found for this query."}`;

  const sourceMarker = `\n\n__SOURCES__:${JSON.stringify(sources)}`;

  if (!IS_AI_CONFIGURED) {
    // Mock streaming response for local dev
    const mockText =
      `I found ${sources.length} relevant page(s) for your query about "${lastUser.content}".\n\n` +
      (sources.length > 0
        ? `Based on the wiki: ${sources.map((s) => s.title).join(", ")} — please configure Azure AI Foundry to get real answers.`
        : "No relevant pages found. Please configure Azure AI Foundry for real AI responses.") +
      sourceMarker;

    return new Response(mockText, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const azure = getAzureClient()!;
  const useOpus = shouldUseOpus(messages);
  const modelId = useOpus ? MODELS.CLAUDE_OPUS : MODELS.CLAUDE_SONNET;

  // Stream response manually so we can append sources at the end
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { streamText } = await import("ai");

        const result = streamText({
          model: azure(modelId),
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          maxOutputTokens: 1000,
        });

        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        // Append sources after stream completes
        controller.enqueue(encoder.encode(sourceMarker));
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(encoder.encode("Sorry, an error occurred while generating a response."));
        controller.enqueue(encoder.encode(sourceMarker));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
