import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "..");
const contentRoot = path.join(cwd, "content");
const configPath = path.join(cwd, "config.json");
const outputDir = path.join(contentRoot, ".generated");
const outputFile = path.join(outputDir, "index.json");
const checkOnly = process.argv.includes("--check");

let config = { index_directories: [] };
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.warn(`Warning: Could not read config file at ${configPath}: ${err.message}`);
  }
}

const REQUIRED_FIELDS = ["id", "type", "title", "slug", "status", "summary"];

function inferTypeFromPath(filePath) {
  if (filePath.includes("/skills/")) return "skill";
  if (filePath.includes("/agents/")) return "agent";
  return "prompt";
}

function resolveEntryKind(fullPath, entry) {
  if (entry.isDirectory()) return "directory";
  if (entry.isFile()) return "file";
  if (!entry.isSymbolicLink()) return "other";

  try {
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) return "directory";
    if (stats.isFile()) return "file";
  } catch (err) {
    console.warn(`Warning: Could not resolve symlink ${fullPath}: ${err.message}`);
  }

  return "other";
}

function walk(dir, seen = new Set()) {
  if (!fs.existsSync(dir)) return [];

  let realDir;
  try {
    realDir = fs.realpathSync(dir);
  } catch (err) {
    console.warn(`Warning: Could not resolve directory ${dir}: ${err.message}`);
    return [];
  }

  if (seen.has(realDir)) {
    return [];
  }
  seen.add(realDir);

  const skillManifestPath = path.join(dir, "SKILL.md");
  if (fs.existsSync(skillManifestPath) && fs.statSync(skillManifestPath).isFile()) {
    return [skillManifestPath];
  }

  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const kind = resolveEntryKind(fullPath, entry);

      if (kind === "directory") {
        files.push(...walk(fullPath, seen));
      } else if (kind === "file" && entry.name.endsWith(".md") && entry.name !== "index.json") {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read directory ${dir}: ${err.message}`);
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

  const id = data.id || data.name || path.basename(path.dirname(filePath));
  const mappedData = {
    ...data,
    id: id,
    type: data.type || inferTypeFromPath(filePath),
    title: data.title || data.name || id,
    slug: data.slug || id,
    status: data.status || "active",
    summary: data.summary || data.description || "",
  };

  return {
    ...mappedData,
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

  if (!["prompt", "skill", "agent"].includes(entry.type)) {
    errors.push(`type must be one of: prompt, skill, agent (got: ${entry.type})`);
  }

  return errors;
}

if (!fs.existsSync(contentRoot)) {
  console.error("content directory not found");
  process.exit(1);
}

const markdownFiles = [
  ...walk(contentRoot),
  ...(config.index_directories || []).flatMap(dir => walk(path.resolve(cwd, dir)))
];
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
