import Link from "next/link";
import { getContentIndex, routeGroups } from "../lib/content";

export default async function HomePage() {
  const index = await getContentIndex();

  return (
    <>
      <section className="hero">
        <h1>Long-term content management for reusable AI building blocks.</h1>
        <p>
          This starter treats prompts, skills, and workflows as structured content assets.
          Everything is stored as Markdown.
        </p>
      </section>

      <section className="stats-grid">
        {routeGroups.map((group) => (
          <Link className="panel" key={group.routeType} href={`/${group.routeType}`}>
            <span className="panel-label">{group.label}</span>
            <strong className="panel-value">
              {index.entries.filter((entry) => entry.type === group.entryType).length}
            </strong>
          </Link>
        ))}
      </section>

      <p className="footer-note">
        Generated index: <code>content/.generated/index.json</code>.
      </p>
    </>
  );
}
