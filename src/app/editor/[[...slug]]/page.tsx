import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { PageEditorForm } from "@/components/editor/page-editor-form";
import { notFound } from "next/navigation";

interface Props {
  params: { slug?: string[] };
}

export default async function EditorPage({ params }: Props) {
  const slug = params.slug?.[0];

  if (!slug) {
    return (
      <MainLayout fullHeight>
        <div className="flex h-full flex-col">
          <PageEditorForm isNew />
        </div>
      </MainLayout>
    );
  }

  const page = await prisma.page.findUnique({
    where: { slug },
    include: { tags: { include: { tag: true } } },
  });

  if (!page) notFound();

  return (
    <MainLayout fullHeight>
      <div className="flex h-full flex-col">
        <PageEditorForm
          slug={page.slug}
          initialTitle={page.title}
          initialContent={page.content}
          initialTags={page.tags.map((pt) => pt.tag.name)}
        />
      </div>
    </MainLayout>
  );
}
