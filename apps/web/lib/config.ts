import fs from "node:fs/promises";
import path from "node:path";

const builtInContentDirectory = path.resolve(process.cwd(), "..", "..", "content");
export const configPath = path.resolve(process.cwd(), "..", "..", "config.json");

export interface AppConfig {
  OWNER_TOKEN: string;
  index_directories: string[];
  public_directories: string[];
  entry_visibility_overrides: Record<string, "public" | "private">;
  [key: string]: unknown;
}

export const defaultConfig: AppConfig = {
  OWNER_TOKEN: "",
  index_directories: [],
  public_directories: [builtInContentDirectory],
  entry_visibility_overrides: {}
};

function normalizeIndexDirectories(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (directory): directory is string => typeof directory === "string" && directory.trim().length > 0
  );
}

function normalizeOwnerToken(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePublicDirectories(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultConfig.public_directories;
  }

  return Array.from(
    new Set(
      value
        .filter((directory): directory is string => typeof directory === "string" && directory.trim().length > 0)
        .map((directory) => path.resolve(directory))
    )
  );
}

function normalizeEntryVisibilityOverrides(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, "public" | "private">;
}

export function normalizeConfig(input: unknown): AppConfig {
  const parsed = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    ...defaultConfig,
    ...parsed,
    OWNER_TOKEN: normalizeOwnerToken(parsed.OWNER_TOKEN),
    index_directories: normalizeIndexDirectories(parsed.index_directories),
    public_directories: normalizePublicDirectories(parsed.public_directories),
    entry_visibility_overrides: normalizeEntryVisibilityOverrides(parsed.entry_visibility_overrides)
  };
}

export async function readConfig() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...defaultConfig };
  }
}
