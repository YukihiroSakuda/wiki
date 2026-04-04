import { createAzure } from "@ai-sdk/azure";
import { env } from "@/lib/env";

/**
 * Azure AI Foundry client via Vercel AI SDK.
 * Falls back to mock mode when env vars are not configured.
 */
export function getAzureClient() {
  if (!env.isAzureAIConfigured()) {
    return null;
  }

  return createAzure({
    resourceName: extractResourceName(env.AZURE_AI_FOUNDRY_ENDPOINT),
    apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
  });
}

function extractResourceName(endpoint: string): string {
  // https://{resource-name}.openai.azure.com/
  try {
    const url = new URL(endpoint);
    return url.hostname.split(".")[0];
  } catch {
    return endpoint;
  }
}

export const IS_AI_CONFIGURED = env.isAzureAIConfigured();
