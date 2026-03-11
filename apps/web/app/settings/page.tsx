"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Folder, ChevronLeft, X } from "lucide-react";

interface Config {
  index_directories: string[];
}

interface FSResponse {
  currentPath: string;
  parentPath: string;
  directories: { name: string; path: string; type: string }[];
  sep: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [fsData, setFsData] = useState<FSResponse | null>(null);
  const [currentBrowsePath, setCurrentBrowsePath] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error("Failed to fetch config", e);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="shell">Loading...</div>;

  return (
    <main className="shell">
      <header className="hero">
        <h1>Settings</h1>
        <p>Configure additional indexing sources for your prompt library.</p>
      </header>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Index Directories</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '15px' }}>
          Add extra directories to scan for Prompts, Skills, and Workflows.
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
        <p>After changing directories, run <code>npm run content:index</code> to update the index.</p>
      </footer>
    </main>
  );
}

function pathName(pathStr: string, sep: string) {
  if (!pathStr) return "";
  const parts = pathStr.split(sep).filter(Boolean);
  return parts[parts.length - 1] || pathStr;
}
