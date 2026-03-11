import fs from "node:fs/promises";
import path from "node:path";

export type EntryType = "prompt" | "skill" | "workflow";
export type RouteType = "prompts" | "skills" | "workflows";

export type ContentEntry = {
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
  relation_types?: string[];
};

export type ContentIndex = {
  generated_at: string;
  count: number;
  entries: ContentEntry[];
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

export async function getContentIndex(): Promise<ContentIndex> {
  const filePath = resolveIndexPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as ContentIndex;
  } catch (err) {
    console.error(`Failed to read content index at ${filePath}:`, err);
    return {
      generated_at: new Date().toISOString(),
      count: 0,
      entries: []
    };
  }
}

export async function getEntriesByRouteType(routeType: string) {
  const entryType = toEntryType(routeType);
  if (!entryType) return null;

  const index = await getContentIndex();
  const group = routeGroups.find((item) => item.routeType === routeType);

  return {
    label: group?.label ?? routeType,
    entries: index.entries.filter((entry) => entry.type === entryType),
    metadataSource: "local-only"
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

  // Simple heuristic: find other entry IDs mentioned in the body
  return entries
    .filter((candidate) => candidate.id !== entry.id && entry.body.includes(candidate.id))
    .map((candidate) => ({
      ...candidate,
      relation_type: "uses"
    }));
}

export async function getRelatedEntriesForEntry(entry: ContentEntry): Promise<RelatedEntry[]> {
  const index = await getContentIndex();
  return inferRelationsFromBody(index.entries, entry);
}

export async function getEntriesForStaticParams(routeType: string) {
  const listing = await getEntriesByRouteType(routeType);
  return listing?.entries ?? [];
}

export function getRouteTypeForEntry(entry: Pick<ContentEntry, "type">) {
  return toRouteType(entry.type);
}
