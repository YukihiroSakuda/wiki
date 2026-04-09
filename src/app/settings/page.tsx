import { MainLayout } from "@/components/layout/main-layout";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  return (
    <MainLayout>
      <div className="p-6">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Settings
          </h1>
        </header>
        <SettingsClient />
      </div>
    </MainLayout>
  );
}
