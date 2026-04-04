export const PROMPTS = {
  summary: (title: string, content: string) => `
You are a technical documentation assistant. Write a concise 2-3 sentence summary of the following wiki page.
Focus on what it covers and why it matters. Be direct and factual. Do not use markdown.

Title: ${title}
Content:
${content.substring(0, 4000)}
`.trim(),

  suggestTags: (title: string, content: string, existingTags: string[]) => `
You are a documentation taxonomy assistant. Suggest up to 5 relevant tags for the following wiki page.
Prefer existing tags when they fit. Return ONLY a JSON array of lowercase kebab-case tag strings.
Example: ["api-design", "authentication", "typescript"]

Existing tags (prefer these): ${existingTags.slice(0, 30).join(", ")}

Title: ${title}
Content:
${content.substring(0, 3000)}

Return only the JSON array, nothing else.
`.trim(),

  continueWriting: (selectedText: string, context: string) => `
You are a technical writer helping to continue writing documentation.
Continue the following selected text naturally, maintaining the same style and tone.
The content is part of a larger wiki page about: "${context}".
Write 1-3 sentences continuation. Do not repeat the selected text. Output only the continuation.

Selected text:
${selectedText}
`.trim(),

  rewrite: (selectedText: string, instruction: string) => `
Rewrite the following text to be clearer and more concise while preserving the meaning.
${instruction ? `Additional instruction: ${instruction}` : ""}
Output only the rewritten text, nothing else.

Original:
${selectedText}
`.trim(),

  translate: (selectedText: string, targetLang: string) => `
Translate the following text to ${targetLang}.
Preserve technical terms, code snippets, and markdown formatting.
Output only the translation, nothing else.

Text:
${selectedText}
`.trim(),
};
