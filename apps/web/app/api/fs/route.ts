import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let currentPath = searchParams.get("path") || os.homedir();

  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const directories = (
      await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            return {
              name: entry.name,
              path: entryPath,
              type: "directory",
            };
          }

          if (!entry.isSymbolicLink()) {
            return null;
          }

          try {
            const stats = await fs.stat(entryPath);
            if (!stats.isDirectory()) {
              return null;
            }

            return {
              name: entry.name,
              path: entryPath,
              type: "symlink-directory",
            };
          } catch {
            return null;
          }
        })
      )
    ).filter((entry): entry is { name: string; path: string; type: string } => entry !== null);

    return NextResponse.json({
      currentPath,
      parentPath: path.dirname(currentPath),
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      sep: path.sep,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
