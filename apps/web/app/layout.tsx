import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NavLinks } from "./NavLinks";
import {
  OWNER_SESSION_COOKIE,
  isAuthorizedOwnerSession,
  isOwnerTokenConfigured
} from "../lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Library",
  description: "Prompt, agent, skill management system."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(OWNER_SESSION_COOKIE)?.value;
  const ownerTokenConfigured = await isOwnerTokenConfigured();
  const hasOwnerAccess =
    !ownerTokenConfigured || (await isAuthorizedOwnerSession(sessionCookie));

  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <span className="brand-kicker">Agent Library</span>
              <strong className="brand-title">Nexus</strong>
              <span className="brand-subtitle">
                Systematic management for prompts, agents, and skills.
              </span>
            </div>
            <NavLinks
              hasOwnerAccess={hasOwnerAccess}
              ownerTokenConfigured={ownerTokenConfigured}
            />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
