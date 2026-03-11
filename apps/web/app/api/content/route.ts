import { NextResponse } from "next/server";
import {
  getAppConfig,
  getContentIndex,
  getEntryVisibility,
  getEntryVisibilityMode,
  getRouteTypeForEntry,
  resolveEntryDirectory
} from "../../../lib/content";

export async function GET() {
  const [index, config] = await Promise.all([getContentIndex(), getAppConfig()]);

  const entries = index.entries
    .map((entry) => {
      const directory = resolveEntryDirectory(entry, config);

      return {
        id: entry.id,
        type: entry.type,
        routeType: getRouteTypeForEntry(entry),
        title: entry.title,
        slug: entry.slug,
        summary: entry.summary,
        source_path: entry.source_path,
        status: entry.status,
        directory_key: directory.directoryKey,
        directory_label: directory.directoryLabel,
        visibility: getEntryVisibility(entry, config),
        visibility_mode: getEntryVisibilityMode(entry, config)
      };
    })
    .sort((left, right) =>
      left.directory_label === right.directory_label
        ? left.title.localeCompare(right.title, "zh-CN")
        : left.directory_label.localeCompare(right.directory_label, "zh-CN")
    );

  return NextResponse.json({ entries });
}
