import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { configPath, normalizeConfig, readConfig } from "../../../lib/config";

const execAsync = promisify(exec);
const scriptPath = path.resolve(process.cwd(), "..", "..", "scripts", "build-content-index.mjs");

export async function GET() {
  return NextResponse.json(await readConfig());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nextConfig = normalizeConfig(body);

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
