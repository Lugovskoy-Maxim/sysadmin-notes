"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Battery,
  Cloud,
  Copy,
  Download,
  HardDrive,
  Link2,
  Maximize2,
  Monitor,
  Network,
  Plus,
  Printer,
  Router,
  Search,
  Server,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  Wifi,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  networkEdgeKinds,
  networkNodeStatuses,
  networkNodeTypes,
  type NetworkEdge,
  type NetworkMap,
  type NetworkNode,
} from "@/lib/facility-types";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  edgeMidpoint,
  exportMapJson,
  filterNodes,
  fitViewport,
  parseImportedMap,
  snapNode,
  snapToGrid,
  type Viewport,
} from "@/lib/network-map-utils";
import { useToast } from "@/lib/toast";

type NetworkMapPanelProps = {
  token: string;
  projectId: string;
};

type InspectorTab = "node" | "edge" | "list";

const nodeIcons = {
  server: Server,
  switch: Network,
  router: Router,
  firewall: Shield,
  pc: Monitor,
  printer: Printer,
  ap: Wifi,
  nas: HardDrive,
  ups: Battery,
  phone: Smartphone,
  cloud: Cloud,
  other: Link2,
} as const;

function newNode(x: number, y: number): NetworkNode {
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: "Узел",
    type: "server",
    status: "unknown",
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
}

function clampScale(scale: number) {
  return Math.min(2, Math.max(0.25, scale));
}

export function NetworkMapPanel({ token, projectId }: NetworkMapPanelProps) {
  const toast = useToast((s) => s.push);
  const canvasRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const [maps, setMaps] = useState<NetworkMap[]>([]);
  const [activeMap, setActiveMap] = useState<NetworkMap | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("node");
  const [viewport, setViewport] = useState<Viewport>({ x: 40, y: 40, scale: 1 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.facility.listNetworkMaps(token, projectId);
      setMaps(list);
      setActiveMap((current) => {
        if (current) return list.find((map) => map.id === current.id) ?? list[0] ?? null;
        return list[0] ?? null;
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить карту сети", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistMap = useCallback(
    async (next: NetworkMap, immediate = false) => {
      const run = async () => {
        try {
          const saved = await api.facility.updateNetworkMap(token, next.id, {
            name: next.name,
            nodes: next.nodes,
            edges: next.edges,
          });
          setActiveMap(saved);
          setMaps((current) => current.map((map) => (map.id === saved.id ? saved : map)));
        } catch (error) {
          toast(error instanceof Error ? error.message : "Не удалось сохранить карту", "error");
        }
      };

      if (immediate) {
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        await run();
        return;
      }

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => void run(), 450);
    },
    [token, toast],
  );

  function applyMap(next: NetworkMap, immediate = false) {
    setActiveMap(next);
    void persistMap(next, immediate);
  }

  async function createMap(name = "Карта сети") {
    try {
      const created = await api.facility.createNetworkMap(token, { projectId, name });
      setMaps((current) => [created, ...current]);
      setActiveMap(created);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setViewport({ x: 40, y: 40, scale: 1 });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать карту", "error");
    }
  }

  async function deleteMap() {
    if (!activeMap) return;
    if (!window.confirm(`Удалить карту «${activeMap.name}»?`)) return;
    try {
      await api.facility.removeNetworkMap(token, activeMap.id);
      const rest = maps.filter((map) => map.id !== activeMap.id);
      setMaps(rest);
      setActiveMap(rest[0] ?? null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      toast("Карта удалена", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить карту", "error");
    }
  }

  function updateNodes(nodes: NetworkNode[], immediate = false) {
    if (!activeMap) return;
    applyMap({ ...activeMap, nodes }, immediate);
  }

  function updateEdges(edges: NetworkEdge[], immediate = false) {
    if (!activeMap) return;
    applyMap({ ...activeMap, edges }, immediate);
  }

  function addNode() {
    if (!activeMap) return;
    const offset = activeMap.nodes.length * 28;
    updateNodes([...activeMap.nodes, newNode(120 + offset, 100 + offset)], true);
  }

  function duplicateNode(id: string) {
    if (!activeMap) return;
    const source = activeMap.nodes.find((node) => node.id === id);
    if (!source) return;
    const copy: NetworkNode = {
      ...source,
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: `${source.label} (копия)`,
      x: snapToGrid(source.x + 32),
      y: snapToGrid(source.y + 32),
    };
    updateNodes([...activeMap.nodes, copy], true);
    setSelectedNodeId(copy.id);
    setSelectedEdgeId(null);
    setInspectorTab("node");
  }

  function removeNode(id: string) {
    if (!activeMap) return;
    applyMap(
      {
        ...activeMap,
        nodes: activeMap.nodes.filter((node) => node.id !== id),
        edges: activeMap.edges.filter((edge) => edge.from !== id && edge.to !== id),
      },
      true,
    );
    if (selectedNodeId === id) setSelectedNodeId(null);
    if (linkFromId === id) setLinkFromId(null);
  }

  function removeEdge(id: string) {
    if (!activeMap) return;
    updateEdges(activeMap.edges.filter((edge) => edge.id !== id), true);
    if (selectedEdgeId === id) setSelectedEdgeId(null);
  }

  function handleNodeClick(node: NetworkNode) {
    if (dragRef.current) return;
    if (linkFromId) {
      if (linkFromId !== node.id) {
        const exists = activeMap?.edges.some(
          (edge) =>
            (edge.from === linkFromId && edge.to === node.id) || (edge.from === node.id && edge.to === linkFromId),
        );
        if (!exists) {
          const edge: NetworkEdge = {
            id: `edge_${Date.now()}`,
            from: linkFromId,
            to: node.id,
            kind: "ethernet",
          };
          updateEdges([...(activeMap?.edges ?? []), edge], true);
        }
      }
      setLinkFromId(null);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setInspectorTab("node");
  }

  function updateSelectedNode(patch: Partial<NetworkNode>) {
    if (!activeMap || !selectedNodeId) return;
    updateNodes(activeMap.nodes.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)));
  }

  function updateSelectedEdge(patch: Partial<NetworkEdge>) {
    if (!activeMap || !selectedEdgeId) return;
    updateEdges(activeMap.edges.map((edge) => (edge.id === selectedEdgeId ? { ...edge, ...patch } : edge)));
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".network-node") || target.closest(".network-edge-hit")) return;

    if (spaceHeld || e.altKey) {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: viewport.x,
        originY: viewport.y,
      };
      return;
    }

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setLinkFromId(null);
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setViewport((current) => ({
        ...current,
        x: panRef.current!.originX + dx,
        y: panRef.current!.originY + dy,
      }));
      return;
    }

    if (!dragRef.current || !canvasRef.current || !activeMap) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.scale - dragRef.current.offsetX;
    const y = (e.clientY - rect.top - viewport.y) / viewport.scale - dragRef.current.offsetY;
    setActiveMap({
      ...activeMap,
      nodes: activeMap.nodes.map((node) =>
        node.id === dragRef.current!.id ? { ...node, x: Math.max(0, x), y: Math.max(0, y) } : node,
      ),
    });
  }

  function onCanvasMouseUp() {
    if (panRef.current) {
      panRef.current = null;
      return;
    }

    if (dragRef.current && activeMap) {
      const snapped = activeMap.nodes.map((node) =>
        node.id === dragRef.current!.id ? snapNode(node) : node,
      );
      applyMap({ ...activeMap, nodes: snapped }, true);
    }
    dragRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      setViewport((current) => ({ ...current, scale: clampScale(current.scale * delta) }));
      return;
    }
    setViewport((current) => ({
      ...current,
      x: current.x - e.deltaX,
      y: current.y - e.deltaY,
    }));
  }

  function fitToView() {
    if (!activeMap || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setViewport(fitViewport(activeMap.nodes, rect.width, rect.height));
  }

  async function handleImport(file: File) {
    try {
      const imported = parseImportedMap(await file.text());
      if (activeMap && !window.confirm("Заменить текущую карту импортированными данными?")) return;

      if (activeMap) {
        applyMap(
          {
            ...activeMap,
            name: imported.name ?? activeMap.name,
            nodes: imported.nodes,
            edges: imported.edges,
          },
          true,
        );
      } else {
        const created = await api.facility.createNetworkMap(token, {
          projectId,
          name: imported.name ?? "Импорт карты",
        });
        const saved = await api.facility.updateNetworkMap(token, created.id, {
          nodes: imported.nodes,
          edges: imported.edges,
        });
        setMaps((current) => [saved, ...current]);
        setActiveMap(saved);
      }
      toast("Карта импортирована", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось импортировать файл", "error");
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Escape") {
        setLinkFromId(null);
        setSelectedEdgeId(null);
        setSelectedNodeId(null);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        if (selectedEdgeId) removeEdge(selectedEdgeId);
        else if (selectedNodeId) removeNode(selectedNodeId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedNodeId) {
        e.preventDefault();
        duplicateNode(selectedNodeId);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const selectedNode = activeMap?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = activeMap?.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const highlightedIds = useMemo(() => new Set(filterNodes(activeMap?.nodes ?? [], search).map((n) => n.id)), [activeMap?.nodes, search]);
  const filteredList = useMemo(() => filterNodes(activeMap?.nodes ?? [], search), [activeMap?.nodes, search]);

  if (loading) return <div className="facility-loading">Загрузка карты сети…</div>;

  return (
    <div className="facility-panel network-panel">
      <div className="network-toolbar">
        <select
          value={activeMap?.id ?? ""}
          onChange={(e) => {
            const map = maps.find((item) => item.id === e.target.value) ?? null;
            setActiveMap(map);
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
        >
          {maps.map((map) => (
            <option key={map.id} value={map.id}>
              {map.name}
            </option>
          ))}
        </select>

        {activeMap ? (
          <input
            className="text-field network-map-name"
            value={activeMap.name}
            onChange={(e) => applyMap({ ...activeMap, name: e.target.value })}
            aria-label="Название карты"
          />
        ) : null}

        <button type="button" className="ghost-button compact" onClick={() => void createMap()}>
          <Plus size={14} />
          Новая
        </button>
        <button type="button" className="ghost-button compact" onClick={addNode} disabled={!activeMap}>
          <Plus size={14} />
          Узел
        </button>
        <button
          type="button"
          className={`ghost-button compact ${linkFromId ? "active" : ""}`}
          disabled={!selectedNodeId}
          onClick={() => setLinkFromId(selectedNodeId)}
          title="Выберите узел, затем целевой узел"
        >
          <Link2 size={14} />
          Связь
        </button>

        <div className="network-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск узлов…"
            aria-label="Поиск узлов"
          />
        </div>

        <div className="network-zoom-controls">
          <button type="button" className="ghost-button compact" onClick={() => setViewport((v) => ({ ...v, scale: clampScale(v.scale * 1.15) }))} title="Увеличить">
            <ZoomIn size={14} />
          </button>
          <span className="network-zoom-label">{Math.round(viewport.scale * 100)}%</span>
          <button type="button" className="ghost-button compact" onClick={() => setViewport((v) => ({ ...v, scale: clampScale(v.scale * 0.87) }))} title="Уменьшить">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="ghost-button compact" onClick={fitToView} title="Показать всё">
            <Maximize2 size={14} />
          </button>
        </div>

        {activeMap ? (
          <>
            <button type="button" className="ghost-button compact" onClick={() => exportMapJson(activeMap)} title="Экспорт JSON">
              <Download size={14} />
            </button>
            <button type="button" className="ghost-button compact" onClick={() => importRef.current?.click()} title="Импорт JSON">
              <Upload size={14} />
            </button>
            <button type="button" className="ghost-button compact danger" onClick={() => void deleteMap()} title="Удалить карту">
              <Trash2 size={14} />
            </button>
          </>
        ) : null}

        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
      </div>

      {linkFromId ? (
        <p className="network-hint">Режим связи: кликните на целевой узел · Esc — отмена</p>
      ) : (
        <p className="network-hint">Перетаскивание узлов · Alt/Space + drag — панорама · Колёсико — масштаб · Del — удалить</p>
      )}

      {activeMap ? (
        <div className="network-layout">
          <div
            ref={canvasRef}
            className={`network-canvas ${spaceHeld ? "panning" : ""}`}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onWheel={onWheel}
          >
            <div
              className="network-canvas-inner"
              style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
            >
              <svg className="network-edges" aria-hidden>
                {activeMap.edges.map((edge) => {
                  const from = activeMap.nodes.find((node) => node.id === edge.from);
                  const to = activeMap.nodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH / 2;
                  const y1 = from.y + NODE_HEIGHT / 2;
                  const x2 = to.x + NODE_WIDTH / 2;
                  const y2 = to.y + NODE_HEIGHT / 2;
                  const mid = edgeMidpoint(from, to);
                  const selected = selectedEdgeId === edge.id;
                  const kind = edge.kind ?? "ethernet";
                  return (
                    <g key={edge.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className={`network-edge-line kind-${kind} ${selected ? "selected" : ""}`}
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className="network-edge-hit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEdgeId(edge.id);
                          setSelectedNodeId(null);
                          setInspectorTab("edge");
                        }}
                      />
                      {edge.label ? (
                        <text x={mid.x} y={mid.y - 6} className="network-edge-label">
                          {edge.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {activeMap.nodes.map((node) => {
                const Icon = nodeIcons[node.type];
                const dimmed = search && !highlightedIds.has(node.id);
                const status = node.status ?? "unknown";
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`network-node type-${node.type} status-${status} ${selectedNodeId === node.id ? "selected" : ""} ${linkFromId === node.id ? "linking" : ""} ${dimmed ? "dimmed" : ""}`}
                    style={{ left: node.x, top: node.y }}
                    onClick={() => handleNodeClick(node)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      dragRef.current = {
                        id: node.id,
                        offsetX: (e.clientX - rect.left) / viewport.scale,
                        offsetY: (e.clientY - rect.top) / viewport.scale,
                      };
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                      setInspectorTab("node");
                    }}
                  >
                    <span className="network-node-icon">
                      <Icon size={16} />
                    </span>
                    <strong>{node.label}</strong>
                    {node.ip ? <small>{node.ip}</small> : null}
                    {node.hostname ? <small className="network-node-host">{node.hostname}</small> : null}
                    <span className="network-node-status-dot" title={networkNodeStatuses.find((s) => s.id === status)?.label} />
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="network-inspector">
            <div className="network-inspector-tabs">
              {(["node", "edge", "list"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={inspectorTab === tab ? "active" : ""}
                  onClick={() => setInspectorTab(tab)}
                >
                  {tab === "node" ? "Узел" : tab === "edge" ? "Связь" : "Список"}
                </button>
              ))}
            </div>

            {inspectorTab === "node" && selectedNode ? (
              <>
                <h3>Свойства узла</h3>
                <label className="field-label">Название</label>
                <input className="text-field" value={selectedNode.label} onChange={(e) => updateSelectedNode({ label: e.target.value })} />
                <label className="field-label">IP-адрес</label>
                <input className="text-field" value={selectedNode.ip ?? ""} onChange={(e) => updateSelectedNode({ ip: e.target.value })} placeholder="192.168.1.10" />
                <label className="field-label">Hostname</label>
                <input className="text-field" value={selectedNode.hostname ?? ""} onChange={(e) => updateSelectedNode({ hostname: e.target.value })} placeholder="srv-dc-01" />
                <label className="field-label">MAC</label>
                <input className="text-field" value={selectedNode.mac ?? ""} onChange={(e) => updateSelectedNode({ mac: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" />
                <label className="field-label">VLAN</label>
                <input className="text-field" value={selectedNode.vlan ?? ""} onChange={(e) => updateSelectedNode({ vlan: e.target.value })} placeholder="10" />
                <label className="field-label">Тип</label>
                <select value={selectedNode.type} onChange={(e) => updateSelectedNode({ type: e.target.value as NetworkNode["type"] })}>
                  {networkNodeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="field-label">Статус</label>
                <select value={selectedNode.status ?? "unknown"} onChange={(e) => updateSelectedNode({ status: e.target.value as NetworkNode["status"] })}>
                  {networkNodeStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <label className="field-label">Заметка</label>
                <textarea className="text-field" rows={3} value={selectedNode.notes ?? ""} onChange={(e) => updateSelectedNode({ notes: e.target.value })} />
                <div className="network-inspector-actions">
                  <button type="button" className="ghost-button full" onClick={() => duplicateNode(selectedNode.id)}>
                    <Copy size={14} />
                    Дублировать
                  </button>
                  <button type="button" className="ghost-button full danger" onClick={() => removeNode(selectedNode.id)}>
                    <Trash2 size={14} />
                    Удалить узел
                  </button>
                </div>
              </>
            ) : null}

            {inspectorTab === "edge" && selectedEdge ? (
              <>
                <h3>Свойства связи</h3>
                <label className="field-label">Подпись (порт / VLAN)</label>
                <input className="text-field" value={selectedEdge.label ?? ""} onChange={(e) => updateSelectedEdge({ label: e.target.value })} placeholder="Gi0/1 → Gi0/24" />
                <label className="field-label">Тип канала</label>
                <select value={selectedEdge.kind ?? "ethernet"} onChange={(e) => updateSelectedEdge({ kind: e.target.value as NetworkEdge["kind"] })}>
                  {networkEdgeKinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                <p className="network-edge-endpoints">
                  {activeMap.nodes.find((n) => n.id === selectedEdge.from)?.label ?? "?"} →{" "}
                  {activeMap.nodes.find((n) => n.id === selectedEdge.to)?.label ?? "?"}
                </p>
                <button type="button" className="ghost-button full danger" onClick={() => removeEdge(selectedEdge.id)}>
                  <Trash2 size={14} />
                  Удалить связь
                </button>
              </>
            ) : null}

            {inspectorTab === "list" ? (
              <>
                <h3>Узлы ({filteredList.length})</h3>
                <ul className="network-node-list">
                  {filteredList.map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        className={selectedNodeId === node.id ? "active" : ""}
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setSelectedEdgeId(null);
                          setInspectorTab("node");
                        }}
                      >
                        <strong>{node.label}</strong>
                        <span>{node.ip || node.hostname || networkNodeTypes.find((t) => t.id === node.type)?.label}</span>
                      </button>
                    </li>
                  ))}
                  {!filteredList.length ? <li className="empty">Нет узлов</li> : null}
                </ul>
              </>
            ) : null}

            {inspectorTab === "node" && !selectedNode ? (
              <p className="network-inspector-empty">Выберите узел на карте или в списке.</p>
            ) : null}
            {inspectorTab === "edge" && !selectedEdge ? (
              <p className="network-inspector-empty">Кликните на линию связи на карте.</p>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="network-empty">
          <Network size={40} strokeWidth={1.2} />
          <strong>Карта сети не создана</strong>
          <button type="button" className="primary-button" onClick={() => void createMap()}>
            <Plus size={16} />
            Создать карту
          </button>
        </div>
      )}
    </div>
  );
}