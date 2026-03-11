import { cookies } from "next/headers";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpen, Zap, Bot, ArrowRight } from "lucide-react";
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
import { OwnerTokenEntry } from "./OwnerTokenEntry";

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

function isSafeNextPath(nextPath?: string) {
  return Boolean(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//"));
}

async function OwnerHomePage() {
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
        <h1>Open access first, owner access on demand.</h1>
        <p>
          Public entries are visible directly on the home page. Enter <code>OWNER_TOKEN</code> to
          unlock prompts, agents, skills, and settings with owner permissions.
        </p>
        <OwnerTokenEntry authRequired={authRequired} nextPath={nextPath} />
      </section>

      <section className="list-header">
        <h1>Published Entries</h1>
        <p>{publicCount} public entries available.</p>
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
