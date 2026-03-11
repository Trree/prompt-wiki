"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck, X } from "lucide-react";

function isSafeNextPath(nextPath?: string) {
  return Boolean(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//"));
}

export function OwnerTokenEntry({
  isOpen,
  onClose,
  authRequired,
  nextPath
}: {
  isOpen: boolean;
  onClose: () => void;
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
      setError("Please enter the OWNER_TOKEN.");
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
        setError("Invalid OWNER_TOKEN.");
        return;
      }

      setToken("");
      onClose();
      router.push(redirectPath as Route);
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <KeyRound size={20} className="auth-input-icon" />
            <strong>Unlock Workspace</strong>
          </div>
          <button className="btn-ghost" style={{ padding: "6px" }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: "24px" }}>
          {authRequired ? (
            <p className="auth-notice" style={{ marginBottom: "20px", width: "100%" }}>
              <ShieldCheck size={14} />
              <span>Restricted content. Authentication required.</span>
            </p>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
              Enter your owner token to access all management features, including private prompts, agents, and settings.
            </p>
          )}

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
                autoFocus
              />
            </div>
          </div>
          {error ? <p className="auth-error-minimal" style={{ marginTop: "8px" }}>{error}</p> : null}
          
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button className="auth-submit-minimal" type="submit" disabled={isSubmitting} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
              {isSubmitting ? "Verifying..." : "Unlock Full Workspace"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
