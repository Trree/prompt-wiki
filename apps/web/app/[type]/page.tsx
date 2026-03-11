import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  getAppConfig,
  getEntriesByRouteType,
  groupEntriesByDirectory,
  getRouteTypeForEntry
} from "../../lib/content";

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

  const config = await getAppConfig();
  const groupedEntries = groupEntriesByDirectory(result.entries, config);

  return (
    <>
      <section className="list-header">
        <h1>{result.label}</h1>
        <p>
          {result.entries.length} entries available across {groupedEntries.length} directories.
        </p>
      </section>

      <div className="directory-groups">
        {groupedEntries.map((group) => (
          <section className="directory-section" key={group.directoryKey}>
            <div className="directory-header">
              <div>
                <span className="directory-kicker">Index directory</span>
                <h2>{group.directoryLabel}</h2>
              </div>
              <span className="directory-count">{group.items.length} items</span>
            </div>

            <div className="card-grid directory-card-grid">
              {group.items.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <div className="badge-row">
                    <span className="badge">{entry.status}</span>
                    {entry.tags?.slice(0, 3).map((tag) => (
                      <span className="badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div>
                    <h2>{entry.title}</h2>
                    <p>{entry.summary}</p>
                  </div>
                  <Link className="entry-link" href={`/${getRouteTypeForEntry(entry)}/${entry.slug}`}>
                    View entry
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
