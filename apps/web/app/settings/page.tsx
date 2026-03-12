"use client";

import type { Route } from "next";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Folder, ChevronLeft, X, Globe, Lock } from "lucide-react";

interface Config {
  index_directories: string[];
  public_directories: string[];
  entry_visibility_overrides: Record<string, "public" | "private">;
}

interface ContentListItem {
  id: string;
  type: "prompt" | "skill" | "agent";
  routeType: "prompts" | "skills" | "agents";
  title: string;
  slug: string;
  summary: string;
  source_path: string;
  status: string;
  directory_key: string;
  directory_label: string;
  visibility: "public" | "private";
  visibility_mode: "directory" | "override";
}

interface FSResponse {
  currentPath: string;
  parentPath: string;
  directories: { name: string; path: string; type: string }[];
  sep: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [entries, setEntries] = useState<ContentListItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [fsData, setFsData] = useState<FSResponse | null>(null);
  const [currentBrowsePath, setCurrentBrowsePath] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([fetchConfig(), fetchEntries()]).finally(() => setLoading(false));
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error("Failed to fetch config", e);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/content");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (e) {
      console.error("Failed to fetch content list", e);
    }
  };

  const saveConfig = async (newConfig: Config) => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
    setConfig(newConfig);
  };

  const handleAddDirectory = (path: string) => {
    if (!config) return;
    if (config.index_directories.includes(path)) {
      alert("Directory already exists");
      return;
    }
    const newConfig = {
      ...config,
      index_directories: [...config.index_directories, path],
    };
    saveConfig(newConfig);
    setShowPicker(false);
  };

  const handleRemoveDirectory = (pathToRemove: string) => {
    if (!config) return;
    const newConfig = {
      ...config,
      index_directories: config.index_directories.filter((p) => p !== pathToRemove),
    };
    saveConfig(newConfig);
  };

  const togglePublicDirectory = (directoryKey: string) => {
    if (!config) return;

    const isPublic = config.public_directories.includes(directoryKey);
    const nextPublicDirectories = isPublic
      ? config.public_directories.filter((item) => item !== directoryKey)
      : [...config.public_directories, directoryKey];

    void saveConfig({
      ...config,
      public_directories: nextPublicDirectories,
    });
  };

  const setEntryOverride = (entry: ContentListItem) => {
    if (!config) return;

    const directoryIsPublic = config.public_directories.includes(entry.directory_key);
    const nextOverride = directoryIsPublic ? "private" : "public";

    void saveConfig({
      ...config,
      entry_visibility_overrides: {
        ...config.entry_visibility_overrides,
        [entry.id]: nextOverride,
      },
    });
  };

  const clearEntryOverride = (entryId: string) => {
    if (!config) return;

    const nextOverrides = { ...config.entry_visibility_overrides };
    delete nextOverrides[entryId];

    void saveConfig({
      ...config,
      entry_visibility_overrides: nextOverrides,
    });
  };

  const browseFS = async (path?: string) => {
    const url = path ? `/api/fs?path=${encodeURIComponent(path)}` : "/api/fs";
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setFsData(data);
    setCurrentBrowsePath(data.currentPath);
    setShowPicker(true);
  };

  const groupedEntries = entries.reduce<Array<{ directoryKey: string; directoryLabel: string; items: ContentListItem[] }>>(
    (groups, entry) => {
      const existingGroup = groups.find((group) => group.directoryKey === entry.directory_key);
      if (existingGroup) {
        existingGroup.items.push(entry);
        return groups;
      }

      groups.push({
        directoryKey: entry.directory_key,
        directoryLabel: entry.directory_label,
        items: [entry],
      });
      return groups;
    },
    []
  );

  if (loading) return <div className="shell">Loading…</div>;

  return (
    <main className="shell">
      <header className="hero">
        <h1>Settings</h1>
        <p>Configure additional indexing sources for your AI asset library.</p>
      </header>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Index Directories</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '15px' }}>
          Add extra directories to scan for Prompts, Agents, and Skills.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {config?.index_directories.map((dir) => (
            <div key={dir} className="list-item">
              <code style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>{dir}</code>
              <button
                onClick={() => handleRemoveDirectory(dir)}
                className="btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          ))}
          {config?.index_directories.length === 0 && (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: 'var(--muted)', 
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              background: 'var(--surface-strong)'
            }}>
              No extra directories configured.
            </div>
          )}
        </div>

        <button
          onClick={() => browseFS()}
          className="entry-link"
          style={{ cursor: 'pointer', border: 'none', width: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <Plus size={16} />
          Add Directory
        </button>
      </section>

      <section className="panel" style={{ marginTop: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>External Sharing</h2>
        <p style={{ color: "var(--muted)", marginBottom: "24px", fontSize: "15px" }}>
          Visibility follows directories first. The built-in <code>content</code> directory is public by default, and you can still use directory or entry overrides for exceptions.
        </p>

        <div className="sharing-summary">
          <div className="meta-card">
            <strong>Public directories</strong>
            <span>{config?.public_directories.length ?? 0}</span>
          </div>
          <div className="meta-card">
            <strong>Entry overrides</strong>
            <span>{Object.keys(config?.entry_visibility_overrides ?? {}).length}</span>
          </div>
          <div className="meta-card">
            <strong>Public home</strong>
            <Link href="/public" className="inline-link">/public</Link>
          </div>
        </div>

        <div className="sharing-list">
          {groupedEntries.map((group) => {
            const directoryIsPublic = config?.public_directories.includes(group.directoryKey) ?? false;

            return (
              <section key={group.directoryKey} className="share-directory">
                <div className="share-directory-header">
                  <div>
                    <span className="directory-kicker">Index directory</span>
                    <strong className="share-item-title">{group.directoryLabel}</strong>
                    <p className="share-item-summary">
                      {group.items.length} entries. Directory default is {directoryIsPublic ? "public" : "private"}.
                    </p>
                  </div>
                  <button
                    onClick={() => togglePublicDirectory(group.directoryKey)}
                    className={directoryIsPublic ? "btn-private" : "btn-public"}
                    type="button"
                  >
                    {directoryIsPublic ? <Lock size={14} /> : <Globe size={14} />}
                    {directoryIsPublic ? "Set Directory Private" : "Set Directory Public"}
                  </button>
                </div>

                <div className="share-directory-items">
                  {group.items.map((entry) => {
                    const override = config?.entry_visibility_overrides[entry.id];
                    const effectiveVisibility = override ?? (directoryIsPublic ? "public" : "private");
                    const publicHref = `/public/${entry.routeType}/${entry.slug}`;

                    return (
                      <div key={entry.id} className="share-item">
                        <div className="share-item-main">
                          <div className="badge-row">
                            <span className="badge">{entry.type}</span>
                            <span className="badge">{entry.status}</span>
                            <span className="badge">{effectiveVisibility}</span>
                            <span className="badge">{override ? "override" : "directory default"}</span>
                          </div>
                          <div>
                            <strong className="share-item-title">{entry.title}</strong>
                            <p className="share-item-summary">{entry.summary}</p>
                            <code className="share-item-path">{entry.source_path}</code>
                          </div>
                        </div>

                        <div className="share-item-actions">
                          {effectiveVisibility === "public" ? (
                            <Link href={publicHref as Route} className="btn-ghost">
                              View public page
                            </Link>
                          ) : null}
                          {override ? (
                            <button
                              onClick={() => clearEntryOverride(entry.id)}
                              className="btn-ghost"
                              type="button"
                            >
                              Use Directory Default
                            </button>
                          ) : (
                            <button
                              onClick={() => setEntryOverride(entry)}
                              className={directoryIsPublic ? "btn-private" : "btn-public"}
                              type="button"
                            >
                              {directoryIsPublic ? <Lock size={14} /> : <Globe size={14} />}
                              {directoryIsPublic ? "Hide This Entry" : "Publish This Entry"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {groupedEntries.length === 0 ? (
            <div className="empty-state">No indexed entries available yet.</div>
          ) : null}
        </div>
      </section>

      {showPicker && fsData && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <strong>Select Directory</strong>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
               <code style={{ color: 'var(--muted)', fontSize: '12px' }}>{currentBrowsePath}</code>
            </div>

            <div className="modal-body">
              <button
                onClick={() => browseFS(fsData.parentPath)}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  padding: '12px 24px', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  fontWeight: '600',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={18} /> <span>..</span> <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 'normal' }}>(Up one level)</span>
              </button>
              {fsData.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => browseFS(dir.path)}
                  style={{ 
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '12px 24px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Folder size={18} style={{ color: 'var(--muted)' }} />
                  <span style={{ fontWeight: '500' }}>{dir.name}</span>
                </button>
              ))}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowPicker(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddDirectory(currentBrowsePath)}
                className="entry-link"
                style={{ cursor: 'pointer', border: 'none', marginTop: 0 }}
              >
                Select: {pathName(currentBrowsePath, fsData.sep)}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-note" style={{ marginTop: '32px', textAlign: 'center' }}>
        <p>After changing directories or sharing settings, run <code>npm run content:index</code> if you need to rebuild the index manually.</p>
      </footer>
    </main>
  );
}

function pathName(pathStr: string, sep: string) {
  if (!pathStr) return "";
  const parts = pathStr.split(sep).filter(Boolean);
  return parts[parts.length - 1] || pathStr;
}
