import type { Metadata } from "next";
import { NavLinks } from "./NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Library",
  description: "Prompt, skill, workflow management system."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <span className="brand-kicker">Prompt Library</span>
              <strong className="brand-title">Nexus</strong>
              <span className="brand-subtitle">
                Systematic management for prompts, skills, and workflows.
              </span>
            </div>
            <NavLinks />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

