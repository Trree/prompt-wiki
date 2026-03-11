import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const configPath = path.resolve(process.cwd(), "..", "..", "config.json");
const scriptPath = path.resolve(process.cwd(), "..", "..", "scripts", "build-content-index.mjs");
const defaultConfig = {
  index_directories: [],
  public_directories: [],
  entry_visibility_overrides: {}
};

export async function GET() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      ...defaultConfig,
      ...parsed
    });
  } catch (err) {
    return NextResponse.json(defaultConfig);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nextConfig = {
      ...defaultConfig,
      ...body,
      index_directories: Array.isArray(body.index_directories) ? body.index_directories : [],
      public_directories: Array.isArray(body.public_directories) ? body.public_directories : [],
      entry_visibility_overrides:
        body.entry_visibility_overrides && typeof body.entry_visibility_overrides === "object"
          ? body.entry_visibility_overrides
          : {}
    };

    await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2), "utf8");
    
    // Automatically refresh index
    try {
      await execAsync(`node ${scriptPath}`);
    } catch (execErr) {
      console.error("Failed to auto-refresh index:", execErr);
      // We still return success: true because the config was saved, 
      // but maybe include a warning or handle it silently if it's just a background task.
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
