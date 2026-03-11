import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpen, Zap, Bot, ChevronRight } from "lucide-react";
import { getContentIndex, routeGroups } from "../lib/content";

const ICON_MAP = {
  prompts: BookOpen,
  skills: Zap,
  agents: Bot,
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
          const Icon = ICON_MAP[group.routeType];
          const count = index.entries.filter((entry) => entry.type === group.entryType).length;
          
          return (
            <Link className="panel group" key={group.routeType} href={`/${group.routeType}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '12px', 
                  background: 'var(--accent-soft)', 
                  color: 'var(--accent)' 
                }}>
                  <Icon size={24} />
                </div>
                <ChevronRight size={16} style={{ color: 'var(--border)' }} />
              </div>
              <div>
                <span className="panel-label">{group.label}</span>
                <strong className="panel-value">{count}</strong>
              </div>
            </Link>
          );
        })}
      </section>

      <p className="footer-note">
        Registry: <code>content/.generated/index.json</code>. Ready for deployment.
      </p>
    </>
  );
}
