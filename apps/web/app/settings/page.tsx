"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

      <section className="detail-shell" style={{ marginTop: '22px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Index Directories</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '22px', fontSize: '15px' }}>
          Add extra directories to scan for Prompts, Skills, and Workflows.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginBottom: '22px' }}>
          {config?.index_directories.map((dir) => (
            <div key={dir} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '12px 16px', 
              background: 'var(--panel-strong)', 
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}>
              <code style={{ fontSize: '14px', color: 'var(--accent)' }}>{dir}</code>
              <button
                onClick={() => handleRemoveDirectory(dir)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#e53e3e', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {config?.index_directories.length === 0 && (
            <div style={{ 
              padding: '22px', 
              textAlign: 'center', 
              color: 'var(--muted)', 
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              fontStyle: 'italic'
            }}>
              No extra directories configured.
            </div>
          )}
        </div>

        <button
          onClick={() => browseFS()}
          className="entry-link"
          style={{ cursor: 'pointer', border: 'none' }}
        >
          Add Directory
        </button>
      </section>

      {showPicker && fsData && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px', 
          zIndex: 1000 
        }}>
          <div className="detail-shell" style={{ 
            width: '100%', 
            maxWidth: '800px', 
            maxHeight: '80vh', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '0',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '16px 22px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'var(--panel-strong)'
            }}>
              <strong style={{ fontSize: '18px' }}>Select Directory</strong>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            
            <div style={{ padding: '10px 22px', background: 'rgba(0,0,0,0.03)', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
               <code style={{ color: 'var(--muted)' }}>{currentBrowsePath}</code>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              <button
                onClick={() => browseFS(fsData.parentPath)}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  padding: '10px 22px', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  display: 'flex',
                  gap: '8px'
                }}
              >
                <span>📁 ..</span> <span style={{ fontSize: '12px', opacity: 0.6 }}>(Up one level)</span>
              </button>
              {fsData.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => browseFS(dir.path)}
                  style={{ 
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '10px 22px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span>📁</span>
                  <span>{dir.name}</span>
                </button>
              ))}
            </div>

            <div style={{ 
              padding: '16px 22px', 
              borderTop: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              background: 'var(--panel-strong)'
            }}>
              <button
                onClick={() => setShowPicker(false)}
                className="nav a"
                style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddDirectory(currentBrowsePath)}
                className="entry-link"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                Select Current: {pathName(currentBrowsePath, fsData.sep)}
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
