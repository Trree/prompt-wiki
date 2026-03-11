import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const configPath = path.resolve(process.cwd(), "..", "..", "config.json");
const scriptPath = path.resolve(process.cwd(), "..", "..", "scripts", "build-content-index.mjs");

export async function GET() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    return NextResponse.json({ index_directories: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(configPath, JSON.stringify(body, null, 2), "utf8");
    
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
