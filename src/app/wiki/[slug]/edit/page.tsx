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
    <MainLayout>
      <div className="max-w-4xl">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            Edit: {page.title}
          </h1>
        </header>
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
