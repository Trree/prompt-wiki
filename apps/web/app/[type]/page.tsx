import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { BookOpen, Zap, Bot, ArrowRight } from "lucide-react";
import {
  getAppConfig,
  getEntriesByRouteType,
  groupEntriesByDirectory,
  getRouteTypeForEntry
} from "../../lib/content";

const CATEGORY_META = {
  prompts: {
    icon: BookOpen,
    color: "var(--prompt-color)",
    bg: "var(--prompt-soft)"
  },
  skills: {
    icon: Zap,
    color: "var(--skill-color)",
    bg: "var(--skill-soft)"
  },
  agents: {
    icon: Bot,
    color: "var(--agent-color)",
    bg: "var(--agent-soft)"
  }
};

export default async function TypeListingPage({
  params
}: {
  params: Promise<{ type: string }>;
}) {
  noStore();
  const { type } = await params;
  const result = await getEntriesByRouteType(type);

  if (!result) {
    notFound();
  }

  const meta = CATEGORY_META[type as keyof typeof CATEGORY_META] || {
    icon: BookOpen,
    color: "var(--accent)",
    bg: "var(--accent-soft)"
  };
  const Icon = meta.icon;

  const config = await getAppConfig();
  const groupedEntries = groupEntriesByDirectory(result.entries, config);

  return (
    <>
      <section className="list-header">
        <h1>{result.label}</h1>
        <p>
          {result.entries.length} assets available across {groupedEntries.length} sources.
        </p>
      </section>

      <div className="directory-groups">
        {groupedEntries.map((group) => (
          <section className="directory-section" key={group.directoryKey}>
            <div className="directory-header">
              <h2>{group.directoryLabel}</h2>
              <span className="directory-count">{group.items.length} items</span>
            </div>

            <div className="card-grid">
              {group.items.map((entry) => (
                <Link 
                  className="entry-card" 
                  key={entry.id} 
                  href={`/${getRouteTypeForEntry(entry)}/${entry.slug}`}
                  style={{ 
                    "--category-color": meta.color,
                    "--category-bg": meta.bg
                  } as React.CSSProperties}
                >
                  <div className="entry-card-header">
                    <div className="entry-card-icon">
                      <Icon size={20} />
                    </div>
                    <div className="badge-row">
                      <span className={`badge status-${entry.status.toLowerCase()}`}>
                        {entry.status}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h2>{entry.title}</h2>
                    <p>{entry.summary}</p>
                  </div>

                  <div className="entry-card-footer">
                    <div className="badge-row">
                      {entry.tags?.slice(0, 2).map((tag) => (
                        <span className="badge" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="entry-link-arrow">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
