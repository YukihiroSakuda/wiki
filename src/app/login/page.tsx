"use client";

import { signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSession().then((session) => {
      if (session) router.replace("/");
    });
  }, [router]);

  const handleAzureLogin = async () => {
    setLoading(true);
    await signIn("azure-ad", { callbackUrl: "/" });
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username: "dev",
      password: "dev",
      redirect: false,
    });
    if (result?.ok) {
      router.replace("/");
    } else {
      setError("Login failed");
      setDevLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] font-mono">
      <div className="w-full max-w-sm">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8">
          {/* Logo / Title */}
          <div className="mb-8">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Internal Wiki
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Sign in to access the knowledge base
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 mb-4 rounded border px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          {/* Azure AD login */}
          <Button
            variant="primary"
            className="mb-3 w-full"
            onClick={handleAzureLogin}
            loading={loading}
          >
            {!loading && (
              <svg viewBox="0 0 23 23" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z" />
              </svg>
            )}
            Sign in with Microsoft
          </Button>

          {/* Dev login (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="flex-1 border-t border-[var(--color-border)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">dev only</span>
                <div className="flex-1 border-t border-[var(--color-border)]" />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleDevLogin}
                loading={devLoading}
              >
                Login as dev user
              </Button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Powered by Azure AI Foundry
        </p>
      </div>
    </div>
  );
}
