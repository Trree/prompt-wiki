import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

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
  metadata_overrides?: Record<string, Partial<ContentEntry>>;
};

export type RelatedEntry = ContentEntry & {
  relation_type: string;
};

export type DirectoryGroup = {
  directoryKey: string;
  directoryLabel: string;
  items: ContentEntry[];
};

export type HomeKnowledgeGraphNode = ContentEntry & {
  routeType: RouteType;
  x: number;
  y: number;
  degree: number;
};

export type HomeKnowledgeGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
};

export type HomeKnowledgeGraph = {
  nodes: HomeKnowledgeGraphNode[];
  edges: HomeKnowledgeGraphEdge[];
  totalNodes: number;
  totalRelationships: number;
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

const HOME_GRAPH_LAYOUT = [
  { x: 50, y: 50 },
  { x: 18, y: 20 },
  { x: 82, y: 20 },
  { x: 12, y: 62 },
  { x: 88, y: 62 },
  { x: 32, y: 86 },
  { x: 68, y: 86 }
];

const HOME_GRAPH_LAYOUT_COMPACT = [
  { x: 50, y: 18 },
  { x: 18, y: 42 },
  { x: 82, y: 42 },
  { x: 32, y: 76 },
  { x: 68, y: 76 }
];

const execFileAsync = promisify(execFile);
let ensureContentIndexPromise: Promise<void> | null = null;

function resolveIndexPath() {
  return path.resolve(process.cwd(), "..", "..", "content", ".generated", "index.json");
}

function resolveConfigPath() {
  return path.resolve(process.cwd(), "..", "..", "config.json");
}

function resolveContentIndexScriptPath() {
  return path.resolve(process.cwd(), "..", "..", "scripts", "build-content-index.mjs");
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

async function ensureContentIndex() {
  const filePath = resolveIndexPath();

  try {
    await fs.access(filePath);
    return;
  } catch {
    // Fall through and build the index on demand.
  }

  if (!ensureContentIndexPromise) {
    ensureContentIndexPromise = (async () => {
      console.warn(`Content index missing at ${filePath}. Regenerating it now.`);
      await execFileAsync(process.execPath, [resolveContentIndexScriptPath()], {
        cwd: resolveRepoRoot()
      });
    })().finally(() => {
      ensureContentIndexPromise = null;
    });
  }

  await ensureContentIndexPromise;
}

export async function getContentIndex(): Promise<ContentIndex> {
  const filePath = resolveIndexPath();
  try {
    await ensureContentIndex();
    const raw = await fs.readFile(filePath, "utf8");
    const index = JSON.parse(raw) as ContentIndex;
    const config = await getAppConfig();

    // Apply metadata overrides if they exist
    if (config.metadata_overrides) {
      index.entries = index.entries.map(entry => {
        const override = config.metadata_overrides![entry.id];
        if (override) {
          const result = { ...entry, ...override };

          // Explicitly merge relationship arrays to reinforce the graph
          const arrayFields: (keyof ContentEntry)[] = ["tags", "prompts", "skills"];
          for (const field of arrayFields) {
            const entryVal = entry[field];
            const overrideVal = override[field];

            if (Array.isArray(entryVal) && Array.isArray(overrideVal)) {
              // Merge and deduplicate
              result[field] = Array.from(new Set([...(entryVal as string[]), ...(overrideVal as string[])])) as any;
            } else if (Array.isArray(overrideVal)) {
              result[field] = overrideVal as any;
            } else if (Array.isArray(entryVal)) {
              result[field] = entryVal as any;
            }
          }

          return result;
        }
        return entry;
      });
    }

    return index;
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
      entry_visibility_overrides: entryVisibilityOverrides,
      metadata_overrides: parsed.metadata_overrides
    };
  } catch (err) {
    console.error(`Failed to read config at ${filePath}:`, err);
    return {
      index_directories: [],
      public_directories: getDefaultPublicDirectories(),
      entry_visibility_overrides: {},
      metadata_overrides: {}
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
  const referenceIds = inferReferenceIds(entries, entry);

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

function inferReferenceIds(entries: ContentEntry[], entry: ContentEntry) {
  const referenceIds = new Set<string>();

  for (const candidateId of [...(entry.skills ?? []), ...(entry.prompts ?? [])]) {
    referenceIds.add(candidateId);
  }

  if (!entry.body) {
    return referenceIds;
  }

  for (const candidate of entries) {
    if (candidate.id !== entry.id && entry.body.includes(candidate.id)) {
      referenceIds.add(candidate.id);
    }
  }

  return referenceIds;
}

function buildEntryKnowledgeGraph(entries: ContentEntry[]) {
  const nodeMap = new Map<string, ContentEntry>();
  const relMap = new Map<string, HomeKnowledgeGraphEdge>();

  for (const entry of entries) {
    nodeMap.set(entry.id, entry);
  }

  // 1. Explicit ID-based relations (uses)
  for (const entry of entries) {
    const referenceIds = inferReferenceIds(entries, entry);

    for (const targetId of referenceIds) {
      if (!nodeMap.has(targetId) || targetId === entry.id) {
        continue;
      }

      const pair = [entry.id, targetId].sort();
      const relId = `${pair[0]}::${pair[1]}::uses`;

      if (!relMap.has(relId)) {
        relMap.set(relId, {
          id: relId,
          sourceId: pair[0],
          targetId: pair[1],
          relationType: "uses"
        });
      }
    }
  }

  // 2. Tag-based implicit relations (related)
  // This helps connect nodes that don't explicitly reference each other
  const entriesByTag = new Map<string, string[]>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      const list = entriesByTag.get(tag) ?? [];
      list.push(entry.id);
      entriesByTag.set(tag, list);
    }
  }

  for (const [tag, ids] of entriesByTag.entries()) {
    if (ids.length < 2) continue;
    // Connect entries sharing the same tag
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pair = [ids[i], ids[j]].sort();
        const relId = `${pair[0]}::${pair[1]}::related`;
        
        if (!relMap.has(relId)) {
          relMap.set(relId, {
            id: relId,
            sourceId: pair[0],
            targetId: pair[1],
            relationType: "related"
          });
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(relMap.values())
  };
}

function scoreEntryForGraph(entry: ContentEntry, degree: number) {
  const statusScore = entry.status.toLowerCase() === "active" ? 2 : entry.status.toLowerCase() === "draft" ? 1 : 0;
  const relationScore = (entry.skills?.length ?? 0) + (entry.prompts?.length ?? 0);
  return degree * 10 + statusScore * 3 + relationScore;
}

function compareGraphEntries(
  degreeById: Map<string, number>,
  entryById: Map<string, ContentEntry>,
  leftId: string,
  rightId: string
) {
  const left = entryById.get(leftId);
  const right = entryById.get(rightId);

  if (!left || !right) {
    return 0;
  }

  const scoreDiff =
    scoreEntryForGraph(right, degreeById.get(rightId) ?? 0) -
    scoreEntryForGraph(left, degreeById.get(leftId) ?? 0);

  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return left.title.localeCompare(right.title, "zh-Hans-CN");
}

function selectHomeGraphEntryIds(
  entries: ContentEntry[],
  edges: HomeKnowledgeGraphEdge[],
  maxNodes: number
) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const adjacency = new Map<string, Set<string>>();

  for (const entry of entries) {
    adjacency.set(entry.id, new Set());
  }

  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
  }

  const degreeById = new Map(
    entries.map((entry) => [entry.id, adjacency.get(entry.id)?.size ?? 0])
  );

  const rankedIds = entries
    .map((entry) => entry.id)
    .sort((leftId, rightId) => compareGraphEntries(degreeById, entryById, leftId, rightId));

  const selectedIds = new Set<string>();

  for (const entryId of rankedIds) {
    if (selectedIds.size >= maxNodes) {
      break;
    }

    if (selectedIds.has(entryId)) {
      continue;
    }

    selectedIds.add(entryId);

    const neighbors = Array.from(adjacency.get(entryId) ?? []).sort((leftId, rightId) =>
      compareGraphEntries(degreeById, entryById, leftId, rightId)
    );

    for (const neighborId of neighbors) {
      if (selectedIds.size >= maxNodes) {
        break;
      }

      selectedIds.add(neighborId);
    }
  }

  return Array.from(selectedIds).sort((leftId, rightId) =>
    compareGraphEntries(degreeById, entryById, leftId, rightId)
  );
}

export async function getHomeKnowledgeGraph(
  options: { visibility?: "all" | "public" } = {}
): Promise<HomeKnowledgeGraph> {
  const visibility = options.visibility ?? "public";
  const [index, config] = await Promise.all([getContentIndex(), getAppConfig()]);
  const visibleEntries = filterEntriesByVisibility(index.entries, config, visibility);
  const graph = buildEntryKnowledgeGraph(visibleEntries);

  if (graph.nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      totalNodes: 0,
      totalRelationships: 0
    };
  }

  const nodes = graph.nodes;
  const edges = graph.edges;

  // Simple circle-based layout for all nodes to avoid overlap
  const positionedNodes = nodes.map((entry, index) => {
    // Distribute nodes in a golden ratio spiral for a natural look
    const phi = index * Math.PI * (3 - Math.sqrt(5)); // golden angle
    const radius = 40 * Math.sqrt(index / nodes.length);
    const x = 50 + radius * Math.cos(phi);
    const y = 50 + radius * Math.sin(phi);

    return {
      ...entry,
      routeType: getRouteTypeForEntry(entry),
      degree: 0, // Will calculate below
      x,
      y
    };
  });

  const degreeById = new Map<string, number>();
  for (const node of positionedNodes) {
    degreeById.set(node.id, 0);
  }

  for (const edge of edges) {
    degreeById.set(edge.sourceId, (degreeById.get(edge.sourceId) ?? 0) + 1);
    degreeById.set(edge.targetId, (degreeById.get(edge.targetId) ?? 0) + 1);
  }

  positionedNodes.forEach(node => {
    node.degree = degreeById.get(node.id) ?? 0;
  });

  return {
    nodes: positionedNodes,
    edges,
    totalNodes: graph.nodes.length,
    totalRelationships: graph.edges.length
  };
}

export async function getEntriesForStaticParams(routeType: string) {
  const listing = await getEntriesByRouteType(routeType);
  return listing?.entries ?? [];
}

export function getRouteTypeForEntry(entry: Pick<ContentEntry, "type">) {
  return toRouteType(entry.type);
}
