import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const contentRoot = path.join(cwd, "content");
const outputDir = path.join(contentRoot, ".generated");
const outputFile = path.join(outputDir, "index.json");
const checkOnly = process.argv.includes("--check");

const REQUIRED_FIELDS = ["id", "type", "title", "slug", "status", "summary"];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { data: {}, body: raw.trim() };
  }

  const lines = match[1].split("\n");
  const data = {};
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(parseScalar(listMatch[1].trim()));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, value] = keyMatch;
    currentKey = key;

    if (!value) {
      data[key] = [];
      continue;
    }

    data[key] = parseScalar(value.trim());
  }

  const body = raw.slice(match[0].length).trim();
  return { data, body };
}

function buildEntry(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const relativePath = path.relative(cwd, filePath).replaceAll(path.sep, "/");

  return {
    ...data,
    source_path: relativePath,
    body,
    body_excerpt: body.slice(0, 160)
  };
}

function validateEntry(entry) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (
      entry[field] === undefined ||
      entry[field] === null ||
      entry[field] === "" ||
      (Array.isArray(entry[field]) && entry[field].length === 0)
    ) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (!["prompt", "skill", "workflow"].includes(entry.type)) {
    errors.push("type must be one of: prompt, skill, workflow");
  }

  return errors;
}

if (!fs.existsSync(contentRoot)) {
  console.error("content directory not found");
  process.exit(1);
}

const markdownFiles = walk(contentRoot);
const entries = markdownFiles.map(buildEntry);
const validationErrors = [];

for (const entry of entries) {
  const errors = validateEntry(entry);
  if (errors.length > 0) {
    validationErrors.push({
      id: entry.id || entry.source_path,
      source_path: entry.source_path,
      errors
    });
  }
}

if (checkOnly) {
  if (validationErrors.length > 0) {
    console.error("content validation failed");
    for (const error of validationErrors) {
      console.error(`- ${error.source_path}`);
      for (const message of error.errors) {
        console.error(`  - ${message}`);
      }
    }
    process.exit(1);
  }

  console.log(`validated ${entries.length} content file(s)`);
  process.exit(0);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputFile,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      count: entries.length,
      entries
    },
    null,
    2
  )
);

if (validationErrors.length > 0) {
  console.warn("index generated with validation warnings");
  for (const error of validationErrors) {
    console.warn(`- ${error.source_path}`);
    for (const message of error.errors) {
      console.warn(`  - ${message}`);
    }
  }
}

console.log(`generated ${entries.length} content entry(ies) at ${path.relative(cwd, outputFile)}`);

