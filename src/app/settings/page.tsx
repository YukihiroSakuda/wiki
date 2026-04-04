import { MainLayout } from "@/components/layout/main-layout";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  return (
    <MainLayout>
      <div className="max-w-xl">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            Settings
          </h1>
        </header>
        <SettingsClient />
      </div>
    </MainLayout>
  );
}
