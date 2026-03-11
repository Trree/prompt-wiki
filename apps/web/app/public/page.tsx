import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getEntriesByRouteType, routeGroups } from "../../lib/content";

export default async function PublicHomePage() {
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
        <h1>Public Library</h1>
        <p>Entries in the built-in content library are public by default. Directory and entry overrides still apply.</p>
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
