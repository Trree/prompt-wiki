import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  getEntryByRouteTypeAndSlug,
  getEntriesForStaticParams,
  getRelatedEntriesForEntry,
  getRouteTypeForEntry,
  routeGroups
} from "../../../lib/content";

export async function generateStaticParams() {
  const params = [];

  for (const group of routeGroups) {
    const entries = await getEntriesForStaticParams(group.routeType);
    for (const entry of entries) {
      params.push({
        type: group.routeType,
        slug: entry.slug
      });
    }
  }

  return params;
}

export default async function EntryDetailPage({
  params
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  const entry = await getEntryByRouteTypeAndSlug(type, slug);

  if (!entry) {
    notFound();
  }

  const related = entry.type === "workflow" ? await getRelatedEntriesForEntry(entry) : [];

  return (
    <article className="detail-shell">
      <header className="detail-header">
        <div className="badge-row">
          <span className="badge">{entry.type}</span>
          <span className="badge">{entry.status}</span>
          {entry.tags?.map((tag) => (
            <span className="badge" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <h1>{entry.title}</h1>
        <p>{entry.summary}</p>
        <div className="detail-meta">Source: {entry.source_path}</div>
      </header>

      <section className="meta-grid">
        <div className="meta-card">
          <strong>Owner</strong>
          <span>{entry.owner || "Unassigned"}</span>
        </div>
        <div className="meta-card">
          <strong>Models</strong>
          <span>{entry.model?.join(", ") || "None"}</span>
        </div>
        <div className="meta-card">
          <strong>Slug</strong>
          <span>{entry.slug}</span>
        </div>
      </section>

      <div className="markdown">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </div>

      {related.length > 0 ? (
        <>
          <section className="list-header">
            <h1>Related entries</h1>
            <p>Automatically detected from mentions in the content body.</p>
          </section>
          <section className="card-grid">
            {related.map((item) => (
              <article className="entry-card" key={item.id}>
                <div className="badge-row">
                  <span className="badge">{item.type}</span>
                  <span className="badge">{item.relation_type}</span>
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                </div>
                <Link className="entry-link" href={`/${getRouteTypeForEntry(item)}/${item.slug}`}>
                  Open entry
                </Link>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </article>
  );
}
