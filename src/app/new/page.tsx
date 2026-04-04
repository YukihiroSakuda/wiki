import { MainLayout } from "@/components/layout/main-layout";
import { PageEditorForm } from "@/components/editor/page-editor-form";

export default function NewPage() {
  return (
    <MainLayout fullHeight>
      <div className="flex h-full flex-col">
        <PageEditorForm isNew />
      </div>
    </MainLayout>
  );
}
