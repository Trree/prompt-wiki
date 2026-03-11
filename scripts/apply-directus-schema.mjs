import process from "node:process";

const directusUrl = process.env.DIRECTUS_URL;
const directusToken = process.env.DIRECTUS_TOKEN;

if (!directusUrl || !directusToken) {
  console.error("DIRECTUS_URL and DIRECTUS_TOKEN are required.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${directusToken}`
};

const collections = [
  {
    collection: "entries",
    meta: {
      icon: "article",
      note: "Prompt, skill, workflow metadata",
      sort_field: null,
      accountability: "all",
      hidden: false,
      singleton: false
    },
    schema: {
      name: "entries"
    }
  },
  {
    collection: "tags",
    meta: {
      icon: "sell",
      note: "Reusable entry tags",
      accountability: "all",
      hidden: false,
      singleton: false
    },
    schema: {
      name: "tags"
    }
  },
  {
    collection: "entries_tags",
    meta: {
      icon: "link",
      note: "Many-to-many join between entries and tags",
      accountability: "all",
      hidden: false,
      singleton: false
    },
    schema: {
      name: "entries_tags"
    }
  },
  {
    collection: "entry_relations",
    meta: {
      icon: "device_hub",
      note: "Relations between entries",
      accountability: "all",
      hidden: false,
      singleton: false
    },
    schema: {
      name: "entry_relations"
    }
  }
];

const fields = [
  ["entries", { field: "id", type: "string", meta: { interface: "input", required: true }, schema: { is_primary_key: true, has_auto_increment: false, is_nullable: false, max_length: 255 } }],
  ["entries", { field: "type", type: "string", meta: { interface: "select-dropdown", required: true, options: { choices: [{ text: "prompt", value: "prompt" }, { text: "skill", value: "skill" }, { text: "workflow", value: "workflow" }] } }, schema: { is_nullable: false, max_length: 64 } }],
  ["entries", { field: "title", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255 } }],
  ["entries", { field: "slug", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255, is_unique: true } }],
  ["entries", { field: "summary", type: "text", meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } }],
  ["entries", { field: "status", type: "string", meta: { interface: "select-dropdown", required: true, options: { choices: [{ text: "draft", value: "draft" }, { text: "active", value: "active" }, { text: "archived", value: "archived" }] } }, schema: { is_nullable: false, max_length: 64 } }],
  ["entries", { field: "owner", type: "string", meta: { interface: "input" }, schema: { is_nullable: true, max_length: 255 } }],
  ["entries", { field: "source_path", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 500 } }],
  ["entries", { field: "version", type: "string", meta: { interface: "input" }, schema: { is_nullable: true, max_length: 64 } }],
  ["entries", { field: "models", type: "json", meta: { interface: "tags" }, schema: { is_nullable: true } }],

  ["tags", { field: "id", type: "integer", meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true, is_nullable: false } }],
  ["tags", { field: "name", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255 } }],
  ["tags", { field: "slug", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255, is_unique: true } }],

  ["entries_tags", { field: "id", type: "integer", meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true, is_nullable: false } }],
  ["entries_tags", { field: "entries_id", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255 } }],
  ["entries_tags", { field: "tags_id", type: "integer", meta: { interface: "input", required: true }, schema: { is_nullable: false } }],

  ["entry_relations", { field: "id", type: "integer", meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true, is_nullable: false } }],
  ["entry_relations", { field: "from_entry_id", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255 } }],
  ["entry_relations", { field: "to_entry_id", type: "string", meta: { interface: "input", required: true }, schema: { is_nullable: false, max_length: 255 } }],
  ["entry_relations", { field: "relation_type", type: "string", meta: { interface: "select-dropdown", required: true, options: { choices: [{ text: "uses", value: "uses" }, { text: "depends_on", value: "depends_on" }, { text: "part_of", value: "part_of" }, { text: "derived_from", value: "derived_from" }] } }, schema: { is_nullable: false, max_length: 64 } }]
];

async function request(endpoint, init = {}) {
  const response = await fetch(`${directusUrl}${endpoint}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return body;
}

async function ensureCollection(definition) {
  try {
    await request("/collections", {
      method: "POST",
      body: JSON.stringify(definition)
    });
    console.log(`created collection: ${definition.collection}`);
  } catch (error) {
    if (
      String(error.message).includes("already exists") ||
      String(error.message).includes("duplicate") ||
      String(error.message).includes("Duplicate")
    ) {
      console.log(`collection exists: ${definition.collection}`);
      return;
    }

    if (String(error.message).includes("403 Forbidden")) {
      console.log(`skipped collection existence probe issue, will continue: ${definition.collection}`);
      return;
    }

    if (!String(error.message).startsWith("400")) {
      throw error;
    }
  }
}

async function ensureField(collection, definition) {
  try {
    await request(`/fields/${collection}`, {
      method: "POST",
      body: JSON.stringify(definition)
    });
    console.log(`created field: ${collection}.${definition.field}`);
  } catch (error) {
    if (
      String(error.message).includes("already exists") ||
      String(error.message).includes("duplicate") ||
      String(error.message).includes("Duplicate")
    ) {
      console.log(`field exists: ${collection}.${definition.field}`);
      return;
    }

    if (!String(error.message).startsWith("400")) {
      throw error;
    }
  }
}

for (const collection of collections) {
  await ensureCollection(collection);
}

for (const [collection, field] of fields) {
  await ensureField(collection, field);
}

console.log("schema apply complete");
