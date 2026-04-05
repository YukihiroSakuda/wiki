export const PROMPTS = {
  summary: (title: string, content: string) =>
    `
You are a technical documentation assistant. Write a concise 2-3 sentence summary of the following wiki page.
Focus on what it covers and why it matters. Be direct and factual. Do not use markdown.

Title: ${title}
Content:
${content.substring(0, 4000)}
`.trim(),

  suggestTags: (title: string, content: string, existingTags: string[]) =>
    `
You are a documentation taxonomy assistant. Suggest up to 5 relevant tags for the following wiki page.
Prefer existing tags when they fit. Return ONLY a JSON array of lowercase kebab-case tag strings.
Example: ["api-design", "authentication", "typescript"]

Existing tags (prefer these): ${existingTags.slice(0, 30).join(", ")}

Title: ${title}
Content:
${content.substring(0, 3000)}

Return only the JSON array, nothing else.
`.trim(),

  continueWriting: (selectedText: string, context: string) =>
    `
You are a technical writer helping to continue writing documentation.
Continue the following selected text naturally, maintaining the same style and tone.
The content is part of a larger wiki page about: "${context}".
Write 1-3 sentences continuation. Do not repeat the selected text. Output only the continuation.

Selected text:
${selectedText}
`.trim(),

  rewrite: (selectedText: string, instruction: string) =>
    `
Rewrite the following text to be clearer and more concise while preserving the meaning.
${instruction ? `Additional instruction: ${instruction}` : ""}
Output only the rewritten text, nothing else.

Original:
${selectedText}
`.trim(),

  translate: (selectedText: string, targetLang: string) =>
    `
Translate the following text to ${targetLang}.
Preserve technical terms, code snippets, and markdown formatting.
Output only the translation, nothing else.

Text:
${selectedText}
`.trim(),

  documentPagesVision: (
    filename: string,
    fileType: string,
    pageStart: number,
    pageEnd: number,
    totalPages: number
  ) =>
    `
You are converting a ${fileType} document to Markdown.
File: "${filename}" — showing pages ${pageStart}–${pageEnd} of ${totalPages}.

For every page, extract ALL content:
- Text: use ## / ### for headings, preserve paragraphs and lists
- Tables: convert to Markdown table syntax (| col | col |)
- Charts / diagrams: describe as ![description of chart](chart)
- Photos / illustrations: describe as ![description](image)
- Code: wrap in fenced code blocks

Separate pages with "---".
Output only Markdown. No preamble, no explanation.
`.trim(),

  documentWithImagesVision: (filename: string, fileType: string, extractedText: string) =>
    `
You are converting a ${fileType} document to Markdown.
File: "${filename}"

The text content extracted from the document is shown below.
Embedded images from the document are attached as images.

For each embedded image, insert a Markdown image tag with a descriptive alt text at the most appropriate location:
  ![descriptive alt text](image)

Convert the text to clean Markdown (headings, lists, tables).
Integrate the image descriptions naturally within the Markdown content.
Output only Markdown. No preamble, no explanation.

--- Extracted text ---
${extractedText.substring(0, 8000)}
`.trim(),

  fileToMarkdown: (filename: string, fileType: string, extractedText: string) =>
    `
You are a technical documentation assistant. Convert the following extracted content from a ${fileType} file ("${filename}") into clean, well-structured Markdown.

Rules:
- Use appropriate Markdown headings (##, ###) to reflect the document structure
- Convert tables to Markdown table syntax
- Convert lists to Markdown lists
- Preserve all important data and text
- For spreadsheets, format each sheet as a separate section with a heading
- For presentations, format each slide as a section
- Remove headers/footers/page numbers if present
- Output only the Markdown, no preamble

Extracted content:
${extractedText.substring(0, 12000)}
`.trim(),

  imageDescription: (filename: string) =>
    `
You are a technical documentation assistant. Analyze this image ("${filename}") and provide:
1. A concise alt text (one sentence, max 100 chars) describing what the image shows
2. A detailed Markdown description of the image content (diagrams, charts, screenshots, photos, etc.)

Format your response exactly as:
ALT: <alt text here>
DESCRIPTION:
<markdown description here>
`.trim(),

  proofread: (title: string, content: string) =>
    `
You are a professional technical writer and editor for an internal company wiki.
Proofread and improve the following wiki page written in Japanese or English (or mixed).

Tasks:
1. Fix grammar, spelling, and style errors in the body text
2. Fix markdown formatting issues (heading levels, list indentation, table alignment, code fences)
3. Improve clarity and conciseness while preserving all information and intent
4. Suggest an improved page title if the current one is vague — keep it unchanged if it is already clear

Rules:
- Preserve ALL code blocks, inline code, URLs, [[wiki links]], and technical terms exactly as-is
- Do not add, remove, or reorder sections — only improve existing content
- Keep the same language(s) as the original
- Return ONLY valid JSON — no markdown fences, no extra text

Current title: ${title}
Content:
${content.substring(0, 8000)}

Return exactly this JSON:
{"title": "improved title here", "content": "improved content here"}
`.trim(),
};
