/**
 * Azure OpenAI model deployment names.
 * Update these to match your actual deployment names in Azure.
 */
export const MODELS = {
  /** GPT-5.4 — fast, cheap tasks: summaries, tag suggestions, short completions */
  GPT_FAST: process.env.AZURE_OPENAI_GPT_FAST_DEPLOYMENT ?? "gpt-5.4",

  /** GPT-5.4-mini — editor assist: continue, rewrite, translate */
  GPT_ASSIST: process.env.AZURE_OPENAI_GPT_ASSIST_DEPLOYMENT ?? "gpt-5.4-mini",

  /** GPT-5.4 — agentic RAG chat, complex reasoning, wiki generation */
  GPT_CHAT: process.env.AZURE_OPENAI_GPT_CHAT_DEPLOYMENT ?? "gpt-5.4",
} as const;
