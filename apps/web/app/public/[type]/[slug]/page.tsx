import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getEntryByRouteTypeAndSlug } from "../../../../lib/content";

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

  return (
    <article className="detail-shell">
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
