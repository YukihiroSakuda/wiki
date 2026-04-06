import { prisma } from "@/lib/prisma";
import { ChatClient } from "./chat-client";

async function getPageMap(): Promise<Record<string, string>> {
  const pages = await prisma.page.findMany({ select: { title: true, slug: true } });
  return Object.fromEntries(pages.map((p) => [p.title, p.slug]));
}

export default async function ChatPage() {
  const pageMap = await getPageMap();
  return <ChatClient pageMap={pageMap} />;
}
