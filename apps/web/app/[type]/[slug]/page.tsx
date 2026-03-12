import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { BookOpen, Zap, Bot, ArrowRight, User, Cpu, Hash, Wrench } from "lucide-react";
import {
  getEntryByRouteTypeAndSlug,
  getRelatedEntriesForEntry,
  getRouteTypeForEntry
} from "../../../lib/content";

const CATEGORY_META = {
  prompt: {
    icon: BookOpen,
    color: "var(--prompt-color)",
    bg: "var(--prompt-soft)"
  },
  skill: {
    icon: Zap,
    color: "var(--skill-color)",
    bg: "var(--skill-soft)"
  },
  agent: {
    icon: Bot,
    color: "var(--agent-color)",
    bg: "var(--agent-soft)"
  }
};

export default async function EntryDetailPage({
  params
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  noStore();
  const { type, slug } = await params;
  const entry = await getEntryByRouteTypeAndSlug(type, slug);

  if (!entry) {
    notFound();
  }

  const meta = CATEGORY_META[entry.type] || {
    icon: BookOpen,
    color: "var(--accent)",
    bg: "var(--accent-soft)"
  };
  const Icon = meta.icon;

  const related = entry.type === "prompt" ? [] : await getRelatedEntriesForEntry(entry);

  return (
    <article className="detail-shell">
      <header className="detail-header" style={{ "--category-color": meta.color } as React.CSSProperties}>
        <div className="badge-row">
          <span className={`badge status-${entry.status.toLowerCase()}`}>{entry.status}</span>
          <span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: "transparent" }}>
            {entry.type}
          </span>
          {entry.tags?.map((tag) => (
            <span className="badge" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="title-row" style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px" }}>
          <div className="entry-card-icon" style={{ background: meta.bg, color: meta.color, width: "48px", height: "48px" }}>
            <Icon size={24} />
          </div>
          <h1 style={{ margin: 0, fontSize: "48px", fontWeight: 900, letterSpacing: "-0.04em" }}>{entry.title}</h1>
        </div>
        <p style={{ fontSize: "20px", color: "var(--muted)", marginTop: "16px", maxWidth: "800px", lineHeight: 1.5 }}>
          {entry.summary}
        </p>
        <div style={{ marginTop: "24px", fontSize: "13px", color: "var(--muted)", fontFamily: "monospace" }}>
          Path: {entry.source_path}
        </div>
      </header>

      <section className="meta-grid">
        <div className="meta-card">
          <strong><User size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Owner</strong>
          <span>{entry.owner || "Unassigned"}</span>
        </div>
        <div className="meta-card">
          <strong><Cpu size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Models</strong>
          <span>{entry.model?.join(", ") || "None"}</span>
        </div>
        <div className="meta-card">
          <strong><Hash size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Slug</strong>
          <span>{entry.slug}</span>
        </div>
        {entry.type === "agent" ? (
          <div className="meta-card">
            <strong><Wrench size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Tools</strong>
            <span>{entry.allowed_tools?.join(", ") || "None"}</span>
          </div>
        ) : null}
      </section>

      <div className="markdown" style={{ background: "white", padding: "40px", borderRadius: "24px", border: "1px solid var(--border)", marginBottom: "64px" }}>
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </div>

      {related.length > 0 ? (
        <section className="related-section">
          <div className="directory-header" style={{ marginBottom: "32px" }}>
            <h2>Related Assets</h2>
            <span className="directory-count">{related.length} items</span>
          </div>
          <div className="card-grid">
            {related.map((item) => {
              const itemMeta = CATEGORY_META[item.type] || meta;
              const ItemIcon = itemMeta.icon;
              return (
                <Link 
                  className="entry-card" 
                  key={item.id} 
                  href={`/${getRouteTypeForEntry(item)}/${item.slug}`}
                  style={{ 
                    "--category-color": itemMeta.color,
                    "--category-bg": itemMeta.bg
                  } as React.CSSProperties}
                >
                  <div className="badge-row">
                    {item.tags?.map((tag) => (
                      <span className="badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div>
                    <h2 style={{ fontSize: "18px" }}>{item.title}</h2>
                    <p style={{ fontSize: "13px" }}>{item.summary}</p>
                  </div>

                  <div className="entry-card-footer">
                    <div className="badge-row">
                      <div className="entry-card-icon" style={{ width: 24, height: 24, padding: 0, borderRadius: 6, background: itemMeta.bg, color: itemMeta.color }}>
                        <ItemIcon size={14} />
                      </div>
                      <span className={`badge status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                      <span className="badge" style={{ background: itemMeta.bg, color: itemMeta.color }}>
                        {item.type}
                      </span>
                    </div>
                    <div className="entry-link-arrow">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </article>
  );
}
