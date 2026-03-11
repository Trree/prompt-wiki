"use client";

import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({
  nextPath,
  tokenConfigured
}: {
  nextPath: string;
  tokenConfigured: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      router.replace(nextPath as Route);
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <span className="directory-kicker">Owner Access</span>
          <h1>Enter owner token</h1>
          <p>Internal pages require the token stored in the `OWNER_TOKEN` environment variable.</p>
        </div>

        {!tokenConfigured ? (
          <p className="auth-error">`OWNER_TOKEN` is not configured. Set it before trying to sign in.</p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="owner-token">
            Owner token
          </label>
          <input
            id="owner-token"
            className="auth-input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Enter token"
            autoComplete="current-password"
          />
          {error ? <p className="auth-error">{error}</p> : null}
          <button
            className="entry-link auth-submit"
            type="submit"
            disabled={!tokenConfigured || submitting || token.length === 0}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
