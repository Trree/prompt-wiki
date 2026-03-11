import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const directusUrl = process.env.DIRECTUS_URL;
const directusToken = process.env.DIRECTUS_TOKEN;
const indexPath = path.join(cwd, "content", ".generated", "index.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function slugifyTag(tag) {
  return String(tag)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${directusToken}`
  };
}

async function directusRequest(endpoint, init = {}) {
  const response = await fetch(`${directusUrl}${endpoint}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function readIndex() {
  if (!fs.existsSync(indexPath)) {
    fail("content index not found. Run `npm run content:index` first.");
  }

  const raw = fs.readFileSync(indexPath, "utf8");
  return JSON.parse(raw);
}

async function upsertEntry(entry) {
  const payload = {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    summary: entry.summary,
    status: entry.status,
    owner: entry.owner ?? null,
    source_path: entry.source_path,
    version: entry.version ?? null,
    models: entry.model ?? []
  };

  if (dryRun) {
    console.log(`[dry-run] upsert entry ${entry.id}`);
    return payload;
  }

  try {
    await directusRequest(`/items/entries/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!String(error.message).startsWith("404")) {
      throw error;
    }

    await directusRequest("/items/entries", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  return payload;
}

async function ensureTag(tagName, tagCache) {
  const tagSlug = slugifyTag(tagName);

  if (tagCache.has(tagSlug)) {
    return tagCache.get(tagSlug);
  }

  if (dryRun) {
    const tag = { id: `dry-run:${tagSlug}`, name: tagName, slug: tagSlug };
    tagCache.set(tagSlug, tag);
    console.log(`[dry-run] ensure tag ${tagSlug}`);
    return tag;
  }

  const existing = await directusRequest(
    `/items/tags?filter[slug][_eq]=${encodeURIComponent(tagSlug)}&limit=1`
  );

  if (existing.data.length > 0) {
    tagCache.set(tagSlug, existing.data[0]);
    return existing.data[0];
  }

  const created = await directusRequest("/items/tags", {
    method: "POST",
    body: JSON.stringify({
      name: tagName,
      slug: tagSlug
    })
  });

  tagCache.set(tagSlug, created.data);
  return created.data;
}

async function ensureEntryTag(entryId, tagId) {
  if (dryRun) {
    console.log(`[dry-run] link entry ${entryId} -> tag ${tagId}`);
    return;
  }

  const existing = await directusRequest(
    `/items/entries_tags?filter[entries_id][_eq]=${encodeURIComponent(entryId)}&filter[tags_id][_eq]=${encodeURIComponent(String(tagId))}&limit=1`
  );

  if (existing.data.length > 0) {
    return;
  }

  await directusRequest("/items/entries_tags", {
    method: "POST",
    body: JSON.stringify({
      entries_id: entryId,
      tags_id: tagId
    })
  });
}

function inferRelations(entries) {
  const ids = new Set(entries.map((entry) => entry.id));
  const relations = [];

  for (const entry of entries) {
    if (entry.type !== "workflow" || !entry.body) {
      continue;
    }

    for (const candidateId of ids) {
      if (candidateId === entry.id) {
        continue;
      }

      if (entry.body.includes(candidateId)) {
        relations.push({
          from_entry_id: entry.id,
          to_entry_id: candidateId,
          relation_type: "uses"
        });
      }
    }
  }

  return relations;
}

async function ensureRelation(relation) {
  if (dryRun) {
    console.log(
      `[dry-run] relation ${relation.from_entry_id} -${relation.relation_type}-> ${relation.to_entry_id}`
    );
    return;
  }

  const query =
    `/items/entry_relations?filter[from_entry_id][_eq]=${encodeURIComponent(relation.from_entry_id)}` +
    `&filter[to_entry_id][_eq]=${encodeURIComponent(relation.to_entry_id)}` +
    `&filter[relation_type][_eq]=${encodeURIComponent(relation.relation_type)}&limit=1`;
  const existing = await directusRequest(query);

  if (existing.data.length > 0) {
    return;
  }

  await directusRequest("/items/entry_relations", {
    method: "POST",
    body: JSON.stringify(relation)
  });
}

async function main() {
  const index = await readIndex();
  const entries = index.entries || [];
  const tagCache = new Map();

  if (!dryRun && (!directusUrl || !directusToken)) {
    fail("DIRECTUS_URL and DIRECTUS_TOKEN are required unless --dry-run is used.");
  }

  console.log(`syncing ${entries.length} content entries${dryRun ? " in dry-run mode" : ""}`);

  for (const entry of entries) {
    await upsertEntry(entry);

    for (const tagName of entry.tags || []) {
      const tag = await ensureTag(tagName, tagCache);
      await ensureEntryTag(entry.id, tag.id);
    }
  }

  const relations = inferRelations(entries);
  for (const relation of relations) {
    await ensureRelation(relation);
  }

  console.log(`sync complete: ${entries.length} entries, ${relations.length} inferred relation(s)`);
}

main().catch((error) => {
  console.error("directus sync failed");
  console.error(error);
  process.exit(1);
});

