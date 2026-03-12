import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { BookOpen, Zap, Bot } from "lucide-react";
import { getEntryByRouteTypeAndSlug } from "../../../../lib/content";

const CATEGORY_META = {
  prompts: {
    icon: BookOpen,
    color: "var(--prompt-color)",
    bg: "var(--prompt-soft)",
  },
  skills: {
    icon: Zap,
    color: "var(--skill-color)",
    bg: "var(--skill-soft)",
  },
  agents: {
    icon: Bot,
    color: "var(--agent-color)",
    bg: "var(--agent-soft)",
  },
};

export default async function PublicEntryDetailPage({
  params
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  noStore();
  const { type, slug } = await params;
  const entry = await getEntryByRouteTypeAndSlug(type, slug, { visibility: "public" });

  if (!entry) {
    notFound();
  }

  const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];

  return (
    <article 
      className="detail-shell"
      style={{
        "--category-color": meta?.color,
        "--category-bg": meta?.bg
      } as React.CSSProperties}
    >
      <header className="detail-header">
        <div className="badge-row">
          <span className="badge">{entry.type}</span>
          <span className="badge">public</span>
        </div>
        <h1>{entry.title}</h1>
        <p>{entry.summary}</p>
      </header>

      <div className="markdown">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </div>
    </article>
  );
}
