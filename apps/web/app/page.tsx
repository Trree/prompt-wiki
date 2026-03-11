import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpen, Zap, Bot, ArrowRight } from "lucide-react";
import { getContentIndex, routeGroups } from "../lib/content";

const CATEGORY_META = {
  prompts: {
    icon: BookOpen,
    color: "var(--prompt-color)",
    bg: "var(--prompt-soft)",
    desc: "Reusable prompt templates with version control and variable support."
  },
  skills: {
    icon: Zap,
    color: "var(--skill-color)",
    bg: "var(--skill-soft)",
    desc: "Actionable capabilities that extend agent functionality via tools."
  },
  agents: {
    icon: Bot,
    color: "var(--agent-color)",
    bg: "var(--agent-soft)",
    desc: "Autonomous personas configured with specific goals and toolsets."
  },
};

export default async function HomePage() {
  noStore();
  const index = await getContentIndex();

  return (
    <>
      <section className="hero">
        <h1>High-performance content management for AI assets.</h1>
        <p>
          Nexus treats prompts, agents, and skills as structured, version-controlled building blocks.
          Build your AI knowledge base with Markdown and Git.
        </p>
      </section>

      <section className="stats-grid">
        {routeGroups.map((group) => {
          const meta = CATEGORY_META[group.routeType];
          const Icon = meta.icon;
          const count = index.entries.filter((entry) => entry.type === group.entryType).length;
          
          return (
            <Link className="panel" key={group.routeType} href={`/${group.routeType}`}>
              <div className="panel-icon-box">
                <div className="panel-icon-wrapper" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={32} />
                </div>
                <ArrowRight size={20} style={{ color: "var(--border)" }} />
              </div>
              <div>
                <span className="panel-label">{group.label}</span>
                <strong className="panel-value">{count}</strong>
              </div>
              <p className="panel-desc">{meta.desc}</p>
            </Link>
          );
        })}
      </section>

      <div className="footer-note">
        Registry: <code>content/.generated/index.json</code>. Ready for production deployment.
      </div>
    </>
  );
}
