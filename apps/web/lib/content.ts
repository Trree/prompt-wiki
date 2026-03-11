import fs from "node:fs/promises";
import path from "node:path";

export type EntryType = "prompt" | "agent" | "skill";
export type RouteType = "prompts" | "agents" | "skills";

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
  skills?: string[];
  prompts?: string[];
  allowed_tools?: string[];
  context?: string;
  scope?: string[];
  handoff_contract?: string;
};

export type ContentIndex = {
  generated_at: string;
  count: number;
  entries: ContentEntry[];
};

export type AppConfig = {
  index_directories: string[];
  public_directories: string[];
  entry_visibility_overrides: Record<string, "public" | "private">;
};

export type RelatedEntry = ContentEntry & {
  relation_type: string;
};

export type DirectoryGroup = {
  directoryKey: string;
  directoryLabel: string;
  items: ContentEntry[];
};

export const routeGroups: Array<{
  routeType: RouteType;
  entryType: EntryType;
  label: string;
}> = [
  { routeType: "prompts", entryType: "prompt", label: "Prompts" },
  { routeType: "agents", entryType: "agent", label: "Agents" },
  { routeType: "skills", entryType: "skill", label: "Skills" }
];

function resolveIndexPath() {
  return path.resolve(process.cwd(), "..", "..", "content", ".generated", "index.json");
}

function resolveConfigPath() {
  return path.resolve(process.cwd(), "..", "..", "config.json");
}

function resolveRepoRoot() {
  return path.resolve(process.cwd(), "..", "..");
}

function resolveBuiltInDirectory() {
  return path.resolve(resolveRepoRoot(), "content");
}

function normalizeDirectoryPath(directory: string) {
  return path.resolve(directory);
}

function getDefaultPublicDirectories() {
  return [resolveBuiltInDirectory()];
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

export async function getAppConfig(): Promise<AppConfig> {
  const filePath = resolveConfigPath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppConfig> & {
      public_entry_ids?: string[];
    };

    const entryVisibilityOverrides: Record<string, "public" | "private"> = {
      ...((parsed.entry_visibility_overrides ?? {}) as Record<string, "public" | "private">)
    };

    for (const entryId of parsed.public_entry_ids ?? []) {
      if (!entryVisibilityOverrides[entryId]) {
        entryVisibilityOverrides[entryId] = "public";
      }
    }

    const publicDirectories = Array.isArray(parsed.public_directories)
      ? Array.from(new Set(parsed.public_directories.map(normalizeDirectoryPath)))
      : getDefaultPublicDirectories();

    return {
      index_directories: parsed.index_directories ?? [],
      public_directories: publicDirectories,
      entry_visibility_overrides: entryVisibilityOverrides
    };
  } catch (err) {
    console.error(`Failed to read config at ${filePath}:`, err);
    return {
      index_directories: [],
      public_directories: getDefaultPublicDirectories(),
      entry_visibility_overrides: {}
    };
  }
}

function isWithinDirectory(filePath: string, directory: string) {
  const relativePath = path.relative(directory, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

export function getDirectoryDefinitions(config: AppConfig) {
  const builtInDirectory = resolveBuiltInDirectory();
  const directories = [builtInDirectory, ...config.index_directories];

  return directories.map((directory) => ({
    directoryKey: directory,
    directoryLabel: directory === builtInDirectory ? "content" : directory
  }));
}

export function resolveEntryDirectory(entry: Pick<ContentEntry, "source_path">, config: AppConfig) {
  const repoRoot = resolveRepoRoot();
  const absoluteSourcePath = path.resolve(repoRoot, entry.source_path);
  const directoryDefinitions = getDirectoryDefinitions(config);
  const matchedDirectory = directoryDefinitions.find((directory) =>
    isWithinDirectory(absoluteSourcePath, directory.directoryKey)
  );

  return matchedDirectory ?? {
    directoryKey: resolveBuiltInDirectory(),
    directoryLabel: "content"
  };
}

export function getEntryVisibility(entry: Pick<ContentEntry, "id" | "source_path">, config: AppConfig) {
  const override = config.entry_visibility_overrides[entry.id];
  if (override) {
    return override;
  }

  const directory = resolveEntryDirectory(entry, config);
  return config.public_directories.includes(directory.directoryKey) ? "public" : "private";
}

export function getEntryVisibilityMode(entry: Pick<ContentEntry, "id" | "source_path">, config: AppConfig) {
  const override = config.entry_visibility_overrides[entry.id];
  if (override) {
    return "override";
  }

  return "directory";
}

function filterEntriesByVisibility(entries: ContentEntry[], config: AppConfig, visibility: "all" | "public") {
  if (visibility === "all") {
    return entries;
  }

  return entries.filter((entry) => getEntryVisibility(entry, config) === "public");
}

export function groupEntriesByDirectory(entries: ContentEntry[], config: AppConfig): DirectoryGroup[] {
  const groupedEntries = new Map<string, ContentEntry[]>();
  const directoryDefinitions = getDirectoryDefinitions(config);
  const directoryLabels = new Map(
    directoryDefinitions.map((directory) => [directory.directoryKey, directory.directoryLabel])
  );

  for (const entry of entries) {
    const directory = resolveEntryDirectory(entry, config);
    const existingGroup = groupedEntries.get(directory.directoryKey);

    if (existingGroup) {
      existingGroup.push(entry);
      continue;
    }

    groupedEntries.set(directory.directoryKey, [entry]);
  }

  return directoryDefinitions
    .filter((directory) => groupedEntries.has(directory.directoryKey))
    .map((directory) => ({
      directoryKey: directory.directoryKey,
      directoryLabel: directoryLabels.get(directory.directoryKey) ?? directory.directoryKey,
      items: groupedEntries.get(directory.directoryKey) ?? []
    }));
}

export async function getEntriesByRouteType(
  routeType: string,
  options: { visibility?: "all" | "public" } = {}
) {
  const entryType = toEntryType(routeType);
  if (!entryType) return null;

  const visibility = options.visibility ?? "all";
  const [index, config] = await Promise.all([getContentIndex(), getAppConfig()]);
  const group = routeGroups.find((item) => item.routeType === routeType);
  const visibleEntries = filterEntriesByVisibility(
    index.entries.filter((entry) => entry.type === entryType),
    config,
    visibility
  );

  return {
    label: group?.label ?? routeType,
    entries: visibleEntries,
    metadataSource: "local-only"
  };
}

export async function getEntryByRouteTypeAndSlug(
  routeType: string,
  slug: string,
  options: { visibility?: "all" | "public" } = {}
) {
  const entryType = toEntryType(routeType);
  if (!entryType) return null;

  const visibility = options.visibility ?? "all";
  const [index, config] = await Promise.all([getContentIndex(), getAppConfig()]);
  const entry = index.entries.find((item) => item.type === entryType && item.slug === slug) ?? null;

  if (!entry) {
    return null;
  }

  if (visibility === "public" && getEntryVisibility(entry, config) !== "public") {
    return null;
  }

  return entry;
}

function inferRelationsFromBody(entries: ContentEntry[], entry: ContentEntry): RelatedEntry[] {
  const referenceIds = new Set<string>();

  for (const candidateId of [
    ...(entry.skills ?? []),
    ...(entry.prompts ?? [])
  ]) {
    referenceIds.add(candidateId);
  }

  if (entry.body) {
    for (const candidate of entries) {
      if (candidate.id !== entry.id && entry.body.includes(candidate.id)) {
        referenceIds.add(candidate.id);
      }
    }
  }

  return entries
    .filter((candidate) => candidate.id !== entry.id && referenceIds.has(candidate.id))
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
