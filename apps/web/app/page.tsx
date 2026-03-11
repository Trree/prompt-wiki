import { cookies } from "next/headers";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpen, Zap, Bot, ArrowRight, Settings, ExternalLink, Clock } from "lucide-react";
import {
  getContentIndex,
  getEntriesByRouteType,
  routeGroups
} from "../lib/content";
import {
  OWNER_SESSION_COOKIE,
  isAuthorizedOwnerSession,
  isOwnerTokenConfigured
} from "../lib/auth";
import { HomeKnowledgeGraph } from "./HomeKnowledgeGraph";

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

function isSafeNextPath(nextPath?: string) {
  return Boolean(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//"));
}

async function OwnerHomePage() {
  noStore();
  const index = await getContentIndex();
  
  const entriesByType = routeGroups.map(group => ({
    ...group,
    entries: index.entries
      .filter(e => e.type === group.entryType)
      .slice(0, 5) // Show top 5 of each for the dashboard
  }));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Workspace Overview</h1>
          <p className="dashboard-subtitle">
            Nexus treats prompts, agents, and skills as version-controlled building blocks.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link href="/settings" className="nav-link">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <Link href="/public" className="nav-link">
            <ExternalLink size={18} />
            <span>Public View</span>
          </Link>
        </div>
      </header>

      <div className="stats-row">
        {routeGroups.map((group) => {
          const meta = CATEGORY_META[group.routeType];
          const Icon = meta.icon;
          const count = index.entries.filter((entry) => entry.type === group.entryType).length;
          
          return (
            <Link className="stat-card" key={group.routeType} href={`/${group.routeType}`}>
              <div className="stat-icon" style={{ background: meta.bg, color: meta.color }}>
                <Icon size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{group.label}</span>
                <strong className="stat-value">{count}</strong>
              </div>
              <ArrowRight size={16} className="stat-arrow" />
            </Link>
          );
        })}
      </div>

      <HomeKnowledgeGraph
        visibility="all"
        title="Workspace connections across prompts, skills, and agents."
        description="A compact graph view of the most connected building blocks in this workspace, based on explicit skill and prompt references."
      />

      <div className="dashboard-grid">
        {entriesByType.map((group) => (
          <section key={group.routeType} className="dashboard-section">
            <div className="section-header">
              <div className="section-title">
                <div 
                  className="section-indicator" 
                  style={{ background: CATEGORY_META[group.routeType].color }} 
                />
                <h2>{group.label}</h2>
              </div>
              <Link href={`/${group.routeType}`} className="view-all">
                View All
              </Link>
            </div>
            
            <div className="entry-list-compact">
              {group.entries.length === 0 ? (
                <div className="empty-mini">No {group.label.toLowerCase()} found.</div>
              ) : (
                group.entries.map((entry) => (
                  <Link 
                    key={entry.id} 
                    href={`/${group.routeType}/${entry.slug}`}
                    className="entry-item-compact"
                  >
                    <div className="entry-item-main">
                      <span className="entry-item-title">{entry.title}</span>
                      <span className="entry-item-slug">{entry.id}</span>
                    </div>
                    <span className={`badge status-${entry.status.toLowerCase()}`}>
                      {entry.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="dashboard-footer">
        <div className="registry-info">
          <Clock size={14} />
          <span>Last indexed: {new Date(index.generated_at).toLocaleString()}</span>
          <span className="divider">|</span>
          <code>content/.generated/index.json</code>
        </div>
      </footer>
    </div>
  );
}

async function PublicHomePage({
  authRequired,
  nextPath
}: {
  authRequired: boolean;
  nextPath?: string;
}) {
  noStore();

  const sections = await Promise.all(
    routeGroups.map(async (group) => ({
      group,
      listing: await getEntriesByRouteType(group.routeType, { visibility: "public" })
    }))
  );

  const visibleSections = sections.filter((section) => (section.listing?.entries.length ?? 0) > 0);
  const publicCount = visibleSections.reduce(
    (total, section) => total + (section.listing?.entries.length ?? 0),
    0
  );

  return (
    <>
      <section className="hero">
        <span className="hero-kicker">Public Library</span>
        <h1>Open access knowledge, version-controlled by experts.</h1>
        <p>
          Browse our collection of verified prompts, agent templates, and reusable skills. 
          Everything here is open for public reference and integration.
        </p>
      </section>

      <HomeKnowledgeGraph
        visibility="public"
        title="How the public knowledge building blocks connect."
        description="A small homepage graph that surfaces the strongest links between prompts, skills, and agents while keeping the existing card UI intact."
      />

      <section className="list-header">
        <h1>Published Entries</h1>
        <p>{publicCount} public entries available for use.</p>
      </section>

      {visibleSections.length === 0 ? (
        <section className="panel empty-state">No public entries are currently visible.</section>
      ) : (
        <div className="directory-groups">
          {visibleSections.map((section) => (
            <section className="directory-section" key={section.group.routeType}>
              <div className="directory-header">
                <div>
                  <span className="directory-kicker">Published type</span>
                  <h2>{section.group.label}</h2>
                </div>
                <span className="directory-count">{section.listing?.entries.length ?? 0} items</span>
              </div>

              <div className="card-grid">
                {section.listing?.entries.map((entry) => (
                  <article className="entry-card" key={entry.id}>
                    <div className="badge-row">
                      <span className="badge">{entry.type}</span>
                      <span className="badge">{entry.status}</span>
                    </div>
                    <div>
                      <h2>{entry.title}</h2>
                      <p>{entry.summary}</p>
                    </div>
                    <Link className="entry-link" href={`/public/${section.group.routeType}/${entry.slug}`}>
                      Open public page
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  noStore();

  const [{ auth, next }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const ownerTokenConfigured = isOwnerTokenConfigured();

  if (!ownerTokenConfigured) {
    return <OwnerHomePage />;
  }

  const sessionCookie = cookieStore.get(OWNER_SESSION_COOKIE)?.value;
  const hasOwnerAccess = await isAuthorizedOwnerSession(sessionCookie);

  if (hasOwnerAccess) {
    return <OwnerHomePage />;
  }

  const nextPath = isSafeNextPath(next) ? next : undefined;
  return <PublicHomePage authRequired={auth === "required"} nextPath={nextPath} />;
}
