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

  // Seed built-in templates
  const templates = [
    {
      name: "Procedure",
      description: "Step-by-step procedure or runbook",
      category: "procedure",
      content: `# Procedure Title

## Overview

Brief description of what this procedure covers and when to use it.

## Prerequisites

- [ ] Prerequisite 1
- [ ] Prerequisite 2

## Steps

### 1. First Step

Description of the first step.

\`\`\`bash
# commands if applicable
\`\`\`

### 2. Second Step

Description of the second step.

### 3. Third Step

Description of the third step.

## Verification

How to verify the procedure was successful.

## Rollback

Steps to undo the changes if something goes wrong.

## References

- Related page: [[Getting Started]]
`,
    },
    {
      name: "Meeting Notes",
      description: "Structured meeting notes with agenda and action items",
      category: "meeting",
      content: `# Meeting: [Topic]

**Date:** YYYY-MM-DD
**Attendees:** @name1, @name2, @name3

## Agenda

1. Topic A
2. Topic B
3. Topic C

## Discussion

### Topic A

Key points discussed.

### Topic B

Key points discussed.

## Decisions

| # | Decision | Owner |
|---|----------|-------|
| 1 | Decision description | @owner |
| 2 | Decision description | @owner |

## Action Items

- [ ] Action item 1 — @owner (due: YYYY-MM-DD)
- [ ] Action item 2 — @owner (due: YYYY-MM-DD)

## Next Meeting

Date and topics for the next meeting.
`,
    },
    {
      name: "Incident Report",
      description: "Post-incident report with timeline and root cause analysis",
      category: "incident",
      content: `# Incident Report: [Title]

**Severity:** P1 / P2 / P3 / P4
**Date:** YYYY-MM-DD
**Duration:** HH:MM
**Status:** Resolved / Investigating / Monitoring

## Summary

One paragraph describing what happened and its impact.

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | First alert triggered |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Impact

- Number of users affected
- Services impacted
- Data loss (if any)

## Root Cause

Detailed description of the root cause.

## Resolution

What was done to resolve the incident.

## Action Items

- [ ] Preventive measure 1 — @owner
- [ ] Preventive measure 2 — @owner
- [ ] Monitoring improvement — @owner

## Lessons Learned

What we learned from this incident.
`,
    },
    {
      name: "Design Document",
      description: "Technical design document for new features or systems",
      category: "design",
      content: `# Design: [Feature/System Name]

**Author:** @name
**Status:** Draft / In Review / Approved
**Date:** YYYY-MM-DD

## Context

Why this design is needed. What problem are we solving?

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Non-goal 1

## Proposed Design

### Overview

High-level description of the proposed solution.

### Architecture

Describe the architecture and key components.

\`\`\`
[Diagram or component layout]
\`\`\`

### Data Model

Describe data model changes if applicable.

### API Changes

Describe API changes if applicable.

## Alternatives Considered

### Alternative A

Description and why it was rejected.

### Alternative B

Description and why it was rejected.

## Security Considerations

- Authentication / authorization impacts
- Data handling concerns

## Testing Plan

How this will be tested.

## Rollout Plan

How this will be deployed and rolled out.

## Open Questions

- Question 1
- Question 2
`,
    },
    {
      name: "Onboarding Guide",
      description: "New team member onboarding checklist",
      category: "onboarding",
      content: `# Onboarding: [Team/Role Name]

Welcome to the team! This guide will help you get set up.

## Day 1

- [ ] Get access to email and Slack
- [ ] Set up development environment
- [ ] Read [[Getting Started]]
- [ ] Meet with your buddy/mentor

## Week 1

- [ ] Complete security training
- [ ] Read team wiki pages
- [ ] Set up local development
- [ ] Make your first PR (starter task)

## Environment Setup

### Prerequisites

- Node.js (v20+)
- Git
- VS Code (recommended)

### Steps

\`\`\`bash
git clone <repo-url>
cd <project>
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Key Resources

| Resource | Link |
|----------|------|
| Repository | [GitHub](#) |
| CI/CD | [GitHub Actions](#) |
| Monitoring | [Dashboard](#) |

## Key Contacts

| Role | Name |
|------|------|
| Team Lead | @name |
| Buddy | @name |

## FAQ

**Q: How do I deploy?**
A: See [[Deployment Guide]]
`,
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: tpl.name, isBuiltIn: true },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          ...tpl,
          authorId: user.id,
          isBuiltIn: true,
        },
      });
    }
  }

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
  console.log(`  Templates: ${templates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
