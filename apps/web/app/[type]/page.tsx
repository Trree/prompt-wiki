import path from "node:path";
import fs from "node:fs/promises";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  type ContentEntry,
  getEntriesByRouteType,
  getRouteTypeForEntry
} from "../../lib/content";

type DirectoryGroup = {
  directory: string;
  items: ContentEntry[];
};

type Config = {
  index_directories?: string[];
};

function resolveRepoRoot() {
  return path.resolve(process.cwd(), "..", "..");
}

async function getIndexDirectories() {
  const configPath = path.resolve(resolveRepoRoot(), "config.json");

  try {
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as Config;
    return config.index_directories ?? [];
  } catch {
    return [];
  }
}

function isWithinDirectory(filePath: string, directory: string) {
  const relativePath = path.relative(directory, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

async function groupEntriesByDirectory(entries: ContentEntry[]): Promise<DirectoryGroup[]> {
  const repoRoot = resolveRepoRoot();
  const builtInDirectory = path.resolve(repoRoot, "content");
  const configuredDirectories = await getIndexDirectories();
  const directoryOrder = [builtInDirectory, ...configuredDirectories];
  const directoryLabels = new Map<string, string>([[builtInDirectory, "content"]]);
  const groups = new Map<string, ContentEntry[]>();

  for (const directory of configuredDirectories) {
    directoryLabels.set(directory, directory);
  }

  for (const entry of entries) {
    const absoluteSourcePath = path.resolve(repoRoot, entry.source_path);
    const matchedDirectory = directoryOrder.find((directory) => isWithinDirectory(absoluteSourcePath, directory));
    const groupKey = matchedDirectory ?? builtInDirectory;
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.push(entry);
      continue;
    }

    groups.set(groupKey, [entry]);
  }

  return directoryOrder
    .filter((directory) => groups.has(directory))
    .map((directory) => ({
      directory: directoryLabels.get(directory) ?? directory,
      items: groups.get(directory) ?? []
    }));
}

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

  const groupedEntries = await groupEntriesByDirectory(result.entries);

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
          <section className="directory-section" key={group.directory}>
            <div className="directory-header">
              <div>
                <span className="directory-kicker">Index directory</span>
                <h2>{group.directory}</h2>
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
