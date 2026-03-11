import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Library",
  description: "Prompt, skill, workflow management starter."
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
              <span className="brand-kicker">Prompt System</span>
              <strong className="brand-title">Prompt. Skill. Workflow.</strong>
              <span className="brand-subtitle">
                Markdown content first. Directus metadata next. Minimal by design.
              </span>
            </div>
            <nav className="nav">
              <Link href="/">Home</Link>
              <Link href="/prompts">Prompts</Link>
              <Link href="/skills">Skills</Link>
              <Link href="/workflows">Workflows</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

