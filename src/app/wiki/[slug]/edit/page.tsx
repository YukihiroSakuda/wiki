import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { PageEditorForm } from "@/components/editor/page-editor-form";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

export default async function EditPage({ params }: Props) {
  const page = await prisma.page.findUnique({
    where: { slug: params.slug },
    include: { tags: { include: { tag: true } } },
  });

  if (!page) notFound();

  const initialTags = page.tags.map((pt) => pt.tag.name);

  return (
    <MainLayout fullHeight>
      <div className="flex h-full flex-col">
        <PageEditorForm
          slug={page.slug}
          initialTitle={page.title}
          initialContent={page.content}
          initialTags={initialTags}
        />
      </div>
    </MainLayout>
  );
}
