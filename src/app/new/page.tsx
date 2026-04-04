import { MainLayout } from "@/components/layout/main-layout";
import { PageEditorForm } from "@/components/editor/page-editor-form";

export default async function NewPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            New Page
          </h1>
        </header>
        <PageEditorForm isNew />
      </div>
    </MainLayout>
  );
}
