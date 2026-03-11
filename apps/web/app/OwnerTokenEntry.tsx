"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

function isSafeNextPath(nextPath?: string) {
  return Boolean(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//"));
}

export function OwnerTokenEntry({
  authRequired,
  nextPath
}: {
  authRequired: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = isSafeNextPath(nextPath) ? nextPath : "/";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token.trim()) {
      setError("请输入 OWNER_TOKEN。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        setError("OWNER_TOKEN 无效。");
        return;
      }

      setToken("");
      router.push(redirectPath as Route);
      router.refresh();
    } catch {
      setError("登录失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-entry-bar">
      {authRequired ? (
        <p className="auth-notice">
          <ShieldCheck size={14} />
          <span>Restricted content. Enter <code>OWNER_TOKEN</code> to unlock.</span>
        </p>
      ) : null}
      
      <form className="auth-form-compact" onSubmit={handleSubmit}>
        <div className="auth-input-group">
          <div className="auth-input-wrapper">
            <KeyRound size={16} className="auth-input-icon" />
            <input
              className="auth-input-minimal"
              type="password"
              name="ownerToken"
              autoComplete="current-password"
              placeholder="Enter Owner Token..."
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button className="auth-submit-minimal" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Unlock Full Workspace"}
            <ArrowRight size={16} />
          </button>
        </div>
        {error ? <p className="auth-error-minimal">{error}</p> : null}
      </form>
    </div>
  );
}
