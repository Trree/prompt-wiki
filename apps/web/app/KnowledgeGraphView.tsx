"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Network, ZoomIn, ZoomOut, Maximize, Settings2, ChevronRight, ChevronDown, X } from "lucide-react";
import type { HomeKnowledgeGraphNode, RouteType, HomeKnowledgeGraphEdge } from "../lib/content";

// Category colors
const CATEGORY_COLORS: Record<RouteType, string> = {
  prompts: "#6366f1",
  skills: "#10b981",
  agents: "#f59e0b",
};

const CATEGORY_LABELS: Record<RouteType, string> = {
  prompts: "Prompts",
  skills: "Skills",
  agents: "Agents",
};

// Dim a color by mixing it toward a background color
function dimColor(hex: string, amount: number, isDark: boolean): string {
  const bg = isDark ? { r: 30, g: 30, b: 46 } : { r: 245, g: 245, b: 247 };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(bg.r + (r - bg.r) * amount);
  const ng = Math.round(bg.g + (g - bg.g) * amount);
  const nb = Math.round(bg.b + (b - bg.b) * amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

interface TooltipState {
  nodeId: string;
  node: HomeKnowledgeGraphNode;
  x: number;
  y: number;
}

interface RegisteredControls {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface SigmaCanvasProps {
  nodes: HomeKnowledgeGraphNode[];
  edges: HomeKnowledgeGraphEdge[];
  activeFilters: Set<RouteType>;
  isDark: boolean;
  onTooltip: (tooltip: TooltipState | null) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  registerControls: (controls: RegisteredControls) => void;
}

// Sigma canvas component — all Sigma.js interaction lives here.
// Imported dynamically from the parent to avoid SSR.
function SigmaCanvas({
  nodes,
  edges,
  activeFilters,
  isDark,
  onTooltip,
  selectedNodeId,
  onSelectNode,
  registerControls,
}: SigmaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<any>(null);
  const graphRef = useRef<any>(null);
  const selectedRef = useRef<string | null>(null);
  const isDarkRef = useRef(isDark);
  const controlsRegistered = useRef(false);
  const physicsFrameRef = useRef<number | null>(null);
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Keep refs in sync without rebuilding the Sigma instance
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    selectedRef.current = selectedNodeId;
    sigmaRef.current?.refresh();
  }, [selectedNodeId]);

  // Build graph and Sigma instance
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      // Dynamic imports prevent server-side rendering issues
      const { default: Sigma } = await import("sigma");
      const { default: Graph } = await import("graphology");
      const { default: forceAtlas2 } = await import("graphology-layout-forceatlas2");

      if (destroyed || !containerRef.current) return;

      // Build graphology graph
      const graph = new Graph({ multi: false });
      graphRef.current = graph;

      const visibleNodeIds = new Set(
        nodes.filter((n) => activeFilters.has(n.routeType)).map((n) => n.id)
      );

      // Compute degree for visible edges only
      const degreeMap = new Map<string, number>();
      for (const edge of edges) {
        if (visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)) {
          degreeMap.set(edge.sourceId, (degreeMap.get(edge.sourceId) ?? 0) + 1);
          degreeMap.set(edge.targetId, (degreeMap.get(edge.targetId) ?? 0) + 1);
        }
      }

      // Add nodes — golden angle spiral for non-overlapping initial positions
      const visibleNodes = nodes.filter((n) => visibleNodeIds.has(n.id));
      const totalN = visibleNodes.length;
      visibleNodes.forEach((node, i) => {
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        const r = 40 * Math.sqrt(i / Math.max(totalN, 1));
        const degree = degreeMap.get(node.id) ?? 0;
        const size = Math.min(20, 4 + degree * 2);
        graph.addNode(node.id, {
          x: r * Math.cos(phi),
          y: r * Math.sin(phi),
          size,
          color: CATEGORY_COLORS[node.routeType],
          label: node.title,
          routeType: node.routeType,
          slug: node.slug,
          summary: node.summary,
        });
      });

      // Add edges
      const edgeColor = isDarkRef.current ? "#3a3a5a" : "#d1d5db";
      for (const edge of edges) {
        if (
          visibleNodeIds.has(edge.sourceId) &&
          visibleNodeIds.has(edge.targetId) &&
          graph.hasNode(edge.sourceId) &&
          graph.hasNode(edge.targetId)
        ) {
          try {
            graph.addEdge(edge.sourceId, edge.targetId, {
              size: 1,
              color: edgeColor,
            });
          } catch (_) {
            // Ignore duplicate edges
          }
        }
      }

      // Run ForceAtlas2 synchronously — fine for small graphs (< 500 nodes)
      if (graph.order > 1) {
        forceAtlas2.assign(graph, {
          iterations: 400,
          settings: {
            gravity: 8,
            scalingRatio: 1.5,
            slowDown: 5,
            barnesHutOptimize: graph.order > 100,
          },
        });
      }

      const bg = isDarkRef.current ? "#1e1e2e" : "#f5f5f7";
      const labelColor = isDarkRef.current ? "#e4e4ed" : "#374151";

      // Cache neighbor set — recomputed only when selection changes
      let cachedSelected: string | null = null;
      let cachedNeighborSet: Set<string> = new Set();

      const sigma = new Sigma(graph, containerRef.current, {
        renderLabels: true,
        labelFont: "Inter, system-ui, sans-serif",
        labelSize: 11,
        labelWeight: "600",
        labelColor: { color: labelColor },
        labelRenderedSizeThreshold: 0, // Always show labels regardless of zoom
        labelDensity: 0.7,
        labelGridCellSize: 60,
        defaultNodeColor: "#6b7280",
        defaultEdgeColor: edgeColor,
        minCameraRatio: 0.05,
        maxCameraRatio: 5,
        hideEdgesOnMove: false,
        zIndex: true,
        backgroundColor: bg,

        nodeReducer: (node: string, data: any) => {
          const res = { ...data };
          const selected = selectedRef.current;
          const dark = isDarkRef.current;

          if (!selected) return res;

          // Recompute neighbor set only when selection changes
          if (selected !== cachedSelected) {
            cachedSelected = selected;
            cachedNeighborSet = new Set(graph.neighbors(selected) as string[]);
          }

          if (node === selected) {
            res.size = (data.size || 6) * 1.8;
            res.zIndex = 2;
            res.highlighted = true;
          } else if (cachedNeighborSet.has(node)) {
            res.size = (data.size || 6) * 1.3;
            res.zIndex = 1;
          } else {
            res.color = dimColor(data.color || "#6b7280", 0.2, dark);
            res.size = (data.size || 6) * 0.6;
            res.zIndex = 0;
          }
          return res;
        },

        edgeReducer: (edge: string, data: any) => {
          const res = { ...data };
          const selected = selectedRef.current;
          const dark = isDarkRef.current;

          if (!selected) return res;

          const [source, target] = graph.extremities(edge) as [string, string];
          if (source === selected || target === selected) {
            res.color = dark ? "#7c7caa" : "#9ca3af";
            res.size = 2;
            res.zIndex = 2;
          } else {
            res.color = dimColor(dark ? "#3a3a5a" : "#d1d5db", 0.1, dark);
            res.size = 0.3;
            res.zIndex = 0;
          }
          return res;
        },
      } as any);

      sigmaRef.current = sigma;

      // Register zoom/reset controls using camera.animate() — works in Sigma v3
      if (!controlsRegistered.current) {
        controlsRegistered.current = true;
        registerControls({
          zoomIn: () => {
            const camera = sigma.getCamera();
            const state = camera.getState();
            camera.animate({ ratio: state.ratio / 1.5 }, { duration: 200 });
          },
          zoomOut: () => {
            const camera = sigma.getCamera();
            const state = camera.getState();
            camera.animate({ ratio: state.ratio * 1.5 }, { duration: 200 });
          },
          reset: () => {
            onSelectNode(null);
            sigma.getCamera().animate(
              { x: 0.5, y: 0.5, ratio: 1, angle: 0 },
              { duration: 300 }
            );
          },
        });
      }

      // Drag nodes
      let draggedNode: string | null = null;
      let wasDragged = false;

      sigma.on("downNode", ({ node }: { node: string }) => {
        draggedNode = node;
        wasDragged = false;
      });

      sigma.getMouseCaptor().on("mousemovebody", (e: any) => {
        if (!draggedNode) return;
        wasDragged = true;
        onTooltip(null);
        const pos = sigma.viewportToGraph(e);
        graph.setNodeAttribute(draggedNode, "x", pos.x);
        graph.setNodeAttribute(draggedNode, "y", pos.y);
        e.preventSigmaDefault();
        e.original.preventDefault();
        e.original.stopPropagation();
      });

      const stopDrag = () => { draggedNode = null; };
      sigma.getMouseCaptor().on("mouseup", stopDrag);
      sigma.getMouseCaptor().on("mouseleave", () => { draggedNode = null; wasDragged = false; });

      // Click node → select/deselect + pan camera (skip if drag occurred)
      sigma.on("clickNode", ({ node }: { node: string }) => {
        if (wasDragged) { wasDragged = false; return; }
        const currentSelected = selectedRef.current;
        if (currentSelected === node) {
          onSelectNode(null);
        } else {
          onSelectNode(node);
          const attrs = graph.getNodeAttributes(node);
          sigma.getCamera().animate(
            { x: attrs.x, y: attrs.y, ratio: 0.5 },
            { duration: 400 }
          );
        }
      });

      // Click empty space → clear selection
      sigma.on("clickStage", () => {
        onSelectNode(null);
      });

      // Hover → show tooltip at node's viewport position
      sigma.on("enterNode", ({ node }: { node: string }) => {
        const nodeAttrs = graph.getNodeAttributes(node);
        const nodeData = nodes.find((n) => n.id === node);
        if (!nodeData || !containerRef.current) return;

        const viewportPos = sigma.graphToViewport({ x: nodeAttrs.x, y: nodeAttrs.y });
        onTooltip({
          nodeId: node,
          node: nodeData,
          x: viewportPos.x,
          y: viewportPos.y,
        });
      });

      sigma.on("leaveNode", () => {
        onTooltip(null);
      });

      // Hide tooltip while panning
      sigma.on("moveBody", () => {
        onTooltip(null);
      });

      // Gravity sensing — DeviceOrientation on mobile, no-op on desktop
      const velocities = new Map<string, { vx: number; vy: number }>();
      graph.forEachNode((id) => velocities.set(id, { vx: 0, vy: 0 }));

      let gx = 0; // tilt left-right
      let gy = 0; // tilt front-back

      const handleOrientation = (e: DeviceOrientationEvent) => {
        gx = (e.gamma ?? 0) / 45;
        gy = (e.beta ?? 0) / 45;
      };
      orientationHandlerRef.current = handleOrientation;
      window.addEventListener("deviceorientation", handleOrientation);

      const GRAVITY_FORCE = 0.6;
      const DAMPING = 0.88;
      const CENTER_PULL = 0.015;

      const runPhysics = () => {
        if (gx !== 0 || gy !== 0) {
          graph.forEachNode((id, attrs) => {
            if (id === draggedNode) return;
            const vel = velocities.get(id)!;
            vel.vx = (vel.vx + gx * GRAVITY_FORCE - attrs.x * CENTER_PULL) * DAMPING;
            vel.vy = (vel.vy + gy * GRAVITY_FORCE - attrs.y * CENTER_PULL) * DAMPING;
            graph.setNodeAttribute(id, "x", attrs.x + vel.vx);
            graph.setNodeAttribute(id, "y", attrs.y + vel.vy);
          });
          sigma.refresh();
        }
        physicsFrameRef.current = requestAnimationFrame(runPhysics);
      };
      physicsFrameRef.current = requestAnimationFrame(runPhysics);
    })();

    return () => {
      destroyed = true;
      if (physicsFrameRef.current !== null) cancelAnimationFrame(physicsFrameRef.current);
      if (orientationHandlerRef.current) {
        window.removeEventListener("deviceorientation", orientationHandlerRef.current);
        orientationHandlerRef.current = null;
      }
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
        graphRef.current = null;
        controlsRegistered.current = false;
      }
    };
    // Rebuild when filters, data, or theme change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activeFilters, isDark]);

  return <div ref={containerRef} className="sigma-graph-container" />;
}

// ─────────────────────────────────────────────
// Public component — used by HomeKnowledgeGraph
// ─────────────────────────────────────────────

export function KnowledgeGraphView({
  graph,
  title,
  description,
}: {
  graph: {
    nodes: HomeKnowledgeGraphNode[];
    edges: HomeKnowledgeGraphEdge[];
    totalNodes: number;
    totalRelationships: number;
  };
  title: string;
  description: string;
}) {
  const [activeFilters, setActiveFilters] = useState<Set<RouteType>>(
    new Set(["prompts", "skills", "agents"])
  );
  const [showSettings, setShowSettings] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const controlsRef = useRef<RegisteredControls | null>(null);

  // Detect system color scheme
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleFilter = useCallback((type: RouteType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const selectedNode = useMemo(
    () => (selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null),
    [selectedNodeId, graph.nodes]
  );

  // Count visible edges for footer
  const visibleEdgeCount = useMemo(() => {
    const nodeIdsByRouteType = new Set(
      graph.nodes
        .filter((n) => activeFilters.has(n.routeType))
        .map((n) => n.id)
    );
    return graph.edges.filter(
      (e) => nodeIdsByRouteType.has(e.sourceId) && nodeIdsByRouteType.has(e.targetId)
    ).length;
  }, [graph.nodes, graph.edges, activeFilters]);

  const visibleNodeCount = useMemo(
    () => graph.nodes.filter((n) => activeFilters.has(n.routeType)).length,
    [graph.nodes, activeFilters]
  );

  return (
    <section className="knowledge-graph-section">
      {/* Header */}
      <div className="knowledge-graph-header">
        <div className="knowledge-graph-copy">
          <span className="directory-kicker">
            <Network size={14} />
            Graph View
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {/* Canvas wrapper — position:relative so overlays work */}
      <div className="knowledge-graph-canvas-wrapper">
        <SigmaCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          activeFilters={activeFilters}
          isDark={isDark}
          onTooltip={setTooltip}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          registerControls={(c) => { controlsRef.current = c; }}
        />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="graph-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="graph-tooltip-type">{CATEGORY_LABELS[tooltip.node.routeType]}</div>
            <div className="graph-tooltip-title">{tooltip.node.title}</div>
            {tooltip.node.summary && (
              <div className="graph-tooltip-summary">{tooltip.node.summary}</div>
            )}
            <Link
              href={`/${tooltip.node.routeType}/${tooltip.node.slug}`}
              className="graph-tooltip-link"
            >
              Open →
            </Link>
          </div>
        )}

        {/* Selected node bar */}
        {selectedNode && (
          <div className="graph-selected-bar">
            <span
              className="graph-selected-dot"
              style={{ background: CATEGORY_COLORS[selectedNode.routeType] }}
            />
            <span className="graph-selected-title">{selectedNode.title}</span>
            <span className="graph-selected-type">{CATEGORY_LABELS[selectedNode.routeType]}</span>
            <Link
              href={`/${selectedNode.routeType}/${selectedNode.slug}`}
              className="graph-selected-open"
            >
              Open
            </Link>
            <button
              className="graph-selected-clear"
              onClick={() => setSelectedNodeId(null)}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Zoom controls */}
        <div className="graph-zoom-actions">
          <button onClick={() => controlsRef.current?.zoomIn()} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => controlsRef.current?.zoomOut()} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => controlsRef.current?.reset()} title="Reset view">
            <Maximize size={18} />
          </button>
        </div>

        {/* Settings panel */}
        <div className={`graph-settings-panel ${showSettings ? "expanded" : "collapsed"}`}>
          <button
            className="settings-toggle"
            onClick={() => setShowSettings((s) => !s)}
          >
            <Settings2 size={16} />
            <span>Graph settings</span>
            {showSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showSettings && (
            <div className="settings-content">
              <div className="settings-group">
                <label>Node types</label>
                <div className="filter-list">
                  {(Object.keys(CATEGORY_COLORS) as RouteType[]).map((type) => (
                    <div key={type} className="filter-item">
                      <input
                        type="checkbox"
                        id={`filter-${type}`}
                        checked={activeFilters.has(type)}
                        onChange={() => toggleFilter(type)}
                      />
                      <label htmlFor={`filter-${type}`}>
                        <span className="dot" style={{ background: CATEGORY_COLORS[type] }} />
                        {CATEGORY_LABELS[type]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="knowledge-graph-footer">
        <div className="graph-meta-pills">
          <span className="graph-pill">{visibleNodeCount} nodes</span>
          <span className="graph-pill">{visibleEdgeCount} links</span>
        </div>
      </div>
    </section>
  );
}
