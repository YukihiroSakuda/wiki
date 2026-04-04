/**
 * Azure AI Foundry model deployment names.
 * Update these to match your actual deployment names in Azure.
 */
export const MODELS = {
  /** GPT-5.4 — fast, cheap tasks: summaries, tag suggestions, short completions */
  GPT_FAST: process.env.AZURE_OPENAI_GPT_FAST_DEPLOYMENT ?? "gpt-5.4",

  /** GPT-5.4-mini — editor assist: continue, rewrite, translate */
  GPT_ASSIST: process.env.AZURE_OPENAI_GPT_ASSIST_DEPLOYMENT ?? "gpt-5.4-mini",

  /** Claude Sonnet 4.6 — RAG chat responses */
  CLAUDE_SONNET: process.env.AZURE_CLAUDE_SONNET_DEPLOYMENT ?? "claude-sonnet-4-6",

  /** Claude Opus 4.6 — complex reasoning escalation */
  CLAUDE_OPUS: process.env.AZURE_CLAUDE_OPUS_DEPLOYMENT ?? "claude-opus-4-6",
} as const;
