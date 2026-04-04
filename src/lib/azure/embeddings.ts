import { createAzure } from "@ai-sdk/azure";
import { embed } from "ai";
import { env } from "@/lib/env";

/**
 * Generate an embedding vector for the given text using Azure OpenAI.
 * Returns null if Azure AI is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!env.isAzureAIConfigured()) return null;

  try {
    const azure = createAzure({
      resourceName: extractResourceName(env.AZURE_AI_FOUNDRY_ENDPOINT),
      apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
    });

    const model = azure.textEmbeddingModel(env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT);

    const { embedding } = await embed({
      model,
      value: text.substring(0, 8000), // token limit buffer
    });

    return embedding;
  } catch (err) {
    console.error("generateEmbedding error:", err);
    return null;
  }
}

function extractResourceName(endpoint: string): string {
  try {
    return new URL(endpoint).hostname.split(".")[0];
  } catch {
    return endpoint;
  }
}
