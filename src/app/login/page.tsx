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
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] font-mono">
      <div className="w-full max-w-sm">
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-surface)] rounded p-8">
          {/* Logo / Title */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Internal Wiki
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Sign in to access the knowledge base
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="mb-4 text-sm text-red-500 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Azure AD login */}
          <Button
            variant="primary"
            className="w-full mb-3"
            onClick={handleAzureLogin}
            loading={loading}
          >
            {!loading && (
              <svg viewBox="0 0 23 23" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z" />
              </svg>
            )}
            Sign in with Microsoft
          </Button>

          {/* Dev login (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <>
              <div className="flex items-center gap-2 my-4">
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

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
          Powered by Azure AI Foundry
        </p>
      </div>
    </div>
  );
}
