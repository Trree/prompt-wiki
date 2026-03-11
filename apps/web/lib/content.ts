import fs from "node:fs/promises";
import path from "node:path";

export type EntryType = "prompt" | "skill" | "workflow";
export type RouteType = "prompts" | "skills" | "workflows";

type LocalContentEntry = {
  id: string;
  type: EntryType;
  title: string;
  slug: string;
  status: string;
  tags?: string[];
  owner?: string;
  model?: string[];
  summary: string;
  source_path: string;
  body: string;
  body_excerpt?: string;
};

type ContentIndex = {
  generated_at: string;
  count: number;
  entries: LocalContentEntry[];
};

type DirectusEntry = {
  id: string;
  type?: EntryType;
  title?: string;
  slug?: string;
  status?: string;
  summary?: string;
  owner?: string | null;
  source_path?: string;
  version?: string | null;
  models?: string[] | null;
};

type DirectusTagLink = {
  entries_id: string;
  tags_id?: {
    id?: number;
    name?: string;
    slug?: string;
  };
};

type DirectusRelation = {
  from_entry_id: string;
  to_entry_id: string;
  relation_type: string;
};

type RemoteMetadataBundle = {
  entriesById: Map<string, DirectusEntry>;
  tagsByEntryId: Map<string, string[]>;
  relations: DirectusRelation[];
};

export type ContentEntry = LocalContentEntry & {
  relation_types?: string[];
};

export type RelatedEntry = ContentEntry & {
  relation_type: string;
};

export const routeGroups: Array<{
  routeType: RouteType;
  entryType: EntryType;
  label: string;
}> = [
  { routeType: "prompts", entryType: "prompt", label: "Prompts" },
  { routeType: "skills", entryType: "skill", label: "Skills" },
  { routeType: "workflows", entryType: "workflow", label: "Workflows" }
];

function resolveIndexPath() {
  return path.resolve(process.cwd(), "..", "..", "content", ".generated", "index.json");
}

function toEntryType(routeType: string): EntryType | null {
  const match = routeGroups.find((group) => group.routeType === routeType);
  return match?.entryType ?? null;
}

function toRouteType(entryType: EntryType): RouteType {
  return `${entryType}s` as RouteType;
}

function getDirectusUrl() {
  return process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || "";
}

function getDirectusToken() {
  return process.env.DIRECTUS_TOKEN || "";
}

function getDirectusHeaders() {
  const token = getDirectusToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchDirectusCollection<T>(endpoint: string): Promise<T[] | null> {
  const baseUrl = getDirectusUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: getDirectusHeaders(),
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: T[] };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return null;
  }
}

export async function getLocalContentIndex(): Promise<ContentIndex> {
  const filePath = resolveIndexPath();
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as ContentIndex;
}

async function getRemoteMetadataBundle(): Promise<RemoteMetadataBundle | null> {
  const [remoteEntries, remoteTags, remoteRelations] = await Promise.all([
    fetchDirectusCollection<DirectusEntry>("/items/entries?limit=-1"),
    fetchDirectusCollection<DirectusTagLink>(
      "/items/entries_tags?limit=-1&fields=entries_id,tags_id.name,tags_id.slug"
    ),
    fetchDirectusCollection<DirectusRelation>("/items/entry_relations?limit=-1")
  ]);

  if (!remoteEntries || !remoteTags || !remoteRelations) {
    return null;
  }

  const entriesById = new Map<string, DirectusEntry>();
  for (const entry of remoteEntries) {
    entriesById.set(entry.id, entry);
  }

  const tagsByEntryId = new Map<string, string[]>();
  for (const link of remoteTags) {
    if (!link.entries_id || !link.tags_id) {
      continue;
    }

    const current = tagsByEntryId.get(link.entries_id) ?? [];
    const tagValue = link.tags_id.slug || link.tags_id.name;
    if (tagValue && !current.includes(tagValue)) {
      current.push(tagValue);
    }
    tagsByEntryId.set(link.entries_id, current);
  }

  return {
    entriesById,
    tagsByEntryId,
    relations: remoteRelations
  };
}

function mergeEntry(localEntry: LocalContentEntry, remote: RemoteMetadataBundle | null): ContentEntry {
  const remoteEntry = remote?.entriesById.get(localEntry.id);
  const remoteTags = remote?.tagsByEntryId.get(localEntry.id);

  return {
    ...localEntry,
    title: remoteEntry?.title || localEntry.title,
    slug: remoteEntry?.slug || localEntry.slug,
    status: remoteEntry?.status || localEntry.status,
    summary: remoteEntry?.summary || localEntry.summary,
    owner: remoteEntry?.owner || localEntry.owner,
    source_path: remoteEntry?.source_path || localEntry.source_path,
    type: remoteEntry?.type || localEntry.type,
    model: remoteEntry?.models || localEntry.model,
    tags: remoteTags || localEntry.tags
  };
}

export async function getContentIndex() {
  const localIndex = await getLocalContentIndex();
  const remote = await getRemoteMetadataBundle();
  const entries = localIndex.entries.map((entry) => mergeEntry(entry, remote));

  return {
    ...localIndex,
    entries,
    metadata_source: remote ? "directus+local" : "local-only"
  };
}

export async function getEntriesByRouteType(routeType: string) {
  const entryType = toEntryType(routeType);
  if (!entryType) return null;

  const index = await getContentIndex();
  const group = routeGroups.find((item) => item.routeType === routeType);

  return {
    label: group?.label ?? routeType,
    entries: index.entries.filter((entry) => entry.type === entryType),
    metadataSource: index.metadata_source
  };
}

export async function getEntryByRouteTypeAndSlug(routeType: string, slug: string) {
  const entryType = toEntryType(routeType);
  if (!entryType) return null;

  const index = await getContentIndex();
  return index.entries.find((entry) => entry.type === entryType && entry.slug === slug) ?? null;
}

function inferRelationsFromBody(entries: ContentEntry[], entry: ContentEntry): RelatedEntry[] {
  if (!entry.body) {
    return [];
  }

  return entries
    .filter((candidate) => candidate.id !== entry.id && entry.body.includes(candidate.id))
    .map((candidate) => ({
      ...candidate,
      relation_type: "uses"
    }));
}

export async function getRelatedEntriesForEntry(entry: ContentEntry): Promise<RelatedEntry[]> {
  const index = await getContentIndex();
  const remote = await getRemoteMetadataBundle();

  if (!remote) {
    return inferRelationsFromBody(index.entries, entry);
  }

  const relatedIds = remote.relations.filter((relation) => relation.from_entry_id === entry.id);
  if (relatedIds.length === 0) {
    return inferRelationsFromBody(index.entries, entry);
  }

  return relatedIds
    .map((relation) => {
      const related = index.entries.find((candidate) => candidate.id === relation.to_entry_id);
      if (!related) {
        return null;
      }

      return {
        ...related,
        relation_type: relation.relation_type
      };
    })
    .filter((value): value is RelatedEntry => value !== null);
}

export async function getEntriesForStaticParams(routeType: string) {
  const listing = await getEntriesByRouteType(routeType);
  return listing?.entries ?? [];
}

export function getRouteTypeForEntry(entry: Pick<ContentEntry, "type">) {
  return toRouteType(entry.type);
}
