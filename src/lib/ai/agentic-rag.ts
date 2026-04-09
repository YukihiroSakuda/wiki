import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { getAzureClient } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { agentTools } from "@/lib/ai/agent-tools";

const SYSTEM_PROMPT = `You are an AI assistant for an internal company wiki. Your job is to help users find and understand information stored in the wiki.

## How to work

1. **Always search before answering.** Use the searchWiki tool to find relevant pages. Do not guess or make up information.
2. **Read full pages when needed.** If search results look relevant but the excerpt is insufficient, use fetchPage to read the full content.
3. **Try different queries.** If your first search returns no results, rephrase and try again. Use listPages as a last resort to browse available content.
4. **Synthesize from multiple sources.** When a question spans multiple topics, search for each one and combine the information.
5. **Cite your sources.** After answering, mention which wiki pages you referenced.
6. **Be honest.** If you cannot find the answer in the wiki, say so clearly. Do not fabricate information.

## Response style

- Be concise and factual
- Use markdown formatting where appropriate
- Write in the same language as the user's question`;

export interface AgenticChatOptions {
  messages: UIMessage[];
  abortSignal?: AbortSignal;
}

/**
 * Stream an agentic RAG chat response.
 * The agent autonomously searches and fetches wiki pages via tools,
 * then synthesizes a final answer.
 */
export async function streamAgenticChat({ messages, abortSignal }: AgenticChatOptions) {
  const azure = getAzureClient()!;
  const modelMessages = await convertToModelMessages(messages);

  return streamText({
    model: azure(MODELS.GPT_CHAT),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: agentTools,
    stopWhen: stepCountIs(8),
    maxOutputTokens: 2000,
    abortSignal,
  });
}
