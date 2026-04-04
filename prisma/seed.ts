import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create dev user
  const user = await prisma.user.upsert({
    where: { email: "dev@localhost" },
    update: {},
    create: {
      id: "dev-user",
      name: "Dev User",
      email: "dev@localhost",
      accentColor: "blue",
      theme: "light",
    },
  });

  // Create tags
  const tags = await Promise.all(
    ["guide", "api", "devops", "frontend", "backend", "architecture"].map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));

  // Helper to create a page with tags
  const createPage = async (slug: string, title: string, content: string, tagNames: string[]) => {
    const page = await prisma.page.upsert({
      where: { slug },
      update: { title, content },
      create: {
        slug,
        title,
        content,
        authorId: user.id,
      },
    });

    // Add tags
    for (const tagName of tagNames) {
      const tag = tagMap[tagName];
      if (tag) {
        await prisma.pageTag.upsert({
          where: { pageId_tagId: { pageId: page.id, tagId: tag.id } },
          update: {},
          create: { pageId: page.id, tagId: tag.id },
        });
      }
    }

    // Create initial revision
    await prisma.revision.create({
      data: { pageId: page.id, content, authorId: user.id },
    });

    return page;
  };

  // Seed pages
  await createPage(
    "getting-started",
    "Getting Started",
    `# Getting Started

Welcome to the Internal Wiki. This is your team's knowledge base powered by LLM.

## How to use

- Browse pages using the left sidebar
- Search with **Ctrl+K**
- Create new pages with **Ctrl+N**
- Use \`[[Page Name]]\` to link to other pages

## AI Features

This wiki includes AI-powered features:

- **AI Summary** — automatically summarizes each page
- **AI Assist** — helps you write and edit content
- **AI Chat** — ask questions about the entire wiki

See [[AI Features Guide]] for more details.`,
    ["guide"]
  );

  await createPage(
    "ai-features-guide",
    "AI Features Guide",
    `# AI Features Guide

This wiki is powered by Azure AI Foundry with GPT-5.4 and Claude 4.6 models.

## AI Summary

Each page gets an automatic summary generated on save. You can regenerate it anytime from the right sidebar.

## AI Assist (Editor)

While editing, select any text to see the AI Assist toolbar:

- **Continue** — LLM writes more text after your selection
- **Rewrite** — LLM rewrites your selected text
- **Translate** — Translate to EN/JA/ZH
- **Suggest** — Get tag suggestions

## AI Chat (RAG)

Click the chat button to ask questions about the entire wiki. The AI will:

1. Search relevant pages using vector search
2. Use those pages as context
3. Generate an accurate answer with source links

See [[Getting Started]] to learn the basics.`,
    ["guide", "api"]
  );

  await createPage(
    "api-design-principles",
    "API Design Principles",
    `# API Design Principles

Guidelines for designing consistent and maintainable APIs.

## REST Conventions

- Use nouns for resource names: \`/users\`, \`/pages\`
- Use HTTP verbs: GET, POST, PUT, DELETE
- Return appropriate status codes

## Naming

- Use kebab-case for URLs: \`/wiki-pages\`
- Use camelCase for JSON fields: \`{ "createdAt": "..." }\`

## Error Responses

All errors should follow this format:

\`\`\`json
{
  "error": "NOT_FOUND",
  "message": "Page not found",
  "statusCode": 404
}
\`\`\`

Related: [[Getting Started]]`,
    ["api", "backend"]
  );

  await createPage(
    "frontend-architecture",
    "Frontend Architecture",
    `# Frontend Architecture

Overview of the frontend stack and conventions.

## Stack

- **Next.js 14** — App Router, Server Components
- **TypeScript** — strict mode enabled
- **Tailwind CSS** — utility-first styling
- **Zustand** — client state management

## Directory Structure

\`\`\`
src/
├── app/          # Routes and pages
├── components/   # Reusable components
│   └── ui/       # Design system primitives
├── lib/          # Utilities and clients
└── stores/       # Zustand stores
\`\`\`

## Component Conventions

- Server Components by default
- Use \`"use client"\` only when needed (event handlers, hooks)
- All UI text in English

See [[API Design Principles]] for backend conventions.`,
    ["frontend", "architecture"]
  );

  await createPage(
    "deployment-guide",
    "Deployment Guide",
    `# Deployment Guide

How to deploy the application to Azure.

## Prerequisites

- Azure subscription
- Azure CLI installed
- Access to Azure AI Foundry

## Services Used

| Service | Purpose |
|---------|---------|
| Azure App Service | Host the Next.js app |
| Azure SQL Database | Production database |
| Azure AI Search | Full-text + vector search |
| Azure Blob Storage | File uploads |
| Azure AI Foundry | LLM inference |
| Azure Entra ID | Authentication |

## Steps

1. Set up Azure resources
2. Configure environment variables
3. Run \`npm run build\`
4. Deploy via GitHub Actions

See [[Frontend Architecture]] for the app structure.`,
    ["devops", "guide"]
  );

  // Add page views for "frequently viewed"
  await prisma.pageView.createMany({
    data: [
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "getting-started" } }))!.id,
        userId: user.id,
      },
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "getting-started" } }))!.id,
        userId: user.id,
      },
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "getting-started" } }))!.id,
        userId: user.id,
      },
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "api-design-principles" } }))!.id,
        userId: user.id,
      },
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "api-design-principles" } }))!.id,
        userId: user.id,
      },
      {
        pageId: (await prisma.page.findUnique({ where: { slug: "frontend-architecture" } }))!.id,
        userId: user.id,
      },
    ],
  });

  console.log("✓ Seed completed");
  console.log(`  Users: 1`);
  console.log(`  Pages: 5`);
  console.log(`  Tags: ${tags.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
