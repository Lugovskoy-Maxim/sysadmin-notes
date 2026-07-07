"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cloud,
  Link2,
  Monitor,
  Network,
  Plus,
  Printer,
  Router,
  Server,
  Trash2,
  Wifi,
} from "lucide-react";
import { api } from "@/lib/api";
import { networkNodeTypes, type NetworkEdge, type NetworkMap, type NetworkNode } from "@/lib/facility-types";
import { useToast } from "@/lib/toast";

type NetworkMapPanelProps = {
  token: string;
  projectId: string;
};

const nodeIcons = {
  server: Server,
  switch: Network,
  router: Router,
  pc: Monitor,
  printer: Printer,
  ap: Wifi,
  cloud: Cloud,
  other: Link2,
} as const;

function newNode(x: number, y: number): NetworkNode {
  return {
    id: `node_${Date.now()}`,
    label: "Узел",
    type: "server",
    x,
    y,
  };
}

export function NetworkMapPanel({ token, projectId }: NetworkMapPanelProps) {
  const toast = useToast((s) => s.push);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [maps, setMaps] = useState<NetworkMap[]>([]);
  const [activeMap, setActiveMap] = useState<NetworkMap | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.facility.listNetworkMaps(token, projectId);
      setMaps(list);
      setActiveMap((current) => current ?? list[0] ?? null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить карту сети", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persistMap(next: NetworkMap) {
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
  }

  async function createMap() {
    try {
      const created = await api.facility.createNetworkMap(token, { projectId, name: "Карта сети" });
      setMaps((current) => [created, ...current]);
      setActiveMap(created);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать карту", "error");
    }
  }

  function updateNodes(nodes: NetworkNode[]) {
    if (!activeMap) return;
    const next = { ...activeMap, nodes };
    setActiveMap(next);
    void persistMap(next);
  }

  function updateEdges(edges: NetworkEdge[]) {
    if (!activeMap) return;
    const next = { ...activeMap, edges };
    setActiveMap(next);
    void persistMap(next);
  }

  function addNode() {
    if (!activeMap) return;
    updateNodes([...activeMap.nodes, newNode(120 + activeMap.nodes.length * 24, 100 + activeMap.nodes.length * 18)]);
  }

  function removeNode(id: string) {
    if (!activeMap) return;
    updateNodes(activeMap.nodes.filter((node) => node.id !== id));
    updateEdges(activeMap.edges.filter((edge) => edge.from !== id && edge.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }

  function handleNodeClick(node: NetworkNode) {
    if (linkFromId) {
      if (linkFromId !== node.id) {
        const edge: NetworkEdge = {
          id: `edge_${Date.now()}`,
          from: linkFromId,
          to: node.id,
        };
        updateEdges([...(activeMap?.edges ?? []), edge]);
      }
      setLinkFromId(null);
      return;
    }
    setSelectedNodeId(node.id);
  }

  function updateSelectedNode(patch: Partial<NetworkNode>) {
    if (!activeMap || !selectedNodeId) return;
    updateNodes(activeMap.nodes.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)));
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragRef.current || !canvasRef.current || !activeMap) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragRef.current.offsetX;
    const y = e.clientY - rect.top - dragRef.current.offsetY;
    setActiveMap({
      ...activeMap,
      nodes: activeMap.nodes.map((node) =>
        node.id === dragRef.current!.id ? { ...node, x: Math.max(20, x), y: Math.max(20, y) } : node,
      ),
    });
  }

  function onCanvasMouseUp() {
    if (dragRef.current && activeMap) {
      void persistMap(activeMap);
    }
    dragRef.current = null;
  }

  const selectedNode = activeMap?.nodes.find((node) => node.id === selectedNodeId) ?? null;

  if (loading) return <div className="facility-loading">Загрузка карты сети…</div>;

  return (
    <div className="facility-panel network-panel">
      <div className="network-toolbar">
        <select
          value={activeMap?.id ?? ""}
          onChange={(e) => setActiveMap(maps.find((map) => map.id === e.target.value) ?? null)}
        >
          {maps.map((map) => (
            <option key={map.id} value={map.id}>
              {map.name}
            </option>
          ))}
        </select>
        <button type="button" className="ghost-button compact" onClick={() => void createMap()}>
          <Plus size={14} />
          Новая карта
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
        >
          <Link2 size={14} />
          Связь
        </button>
      </div>

      {activeMap ? (
        <div className="network-layout">
          <div
            ref={canvasRef}
            className="network-canvas"
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            <svg className="network-edges" aria-hidden>
              {activeMap.edges.map((edge) => {
                const from = activeMap.nodes.find((node) => node.id === edge.from);
                const to = activeMap.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={edge.id}
                    x1={from.x + 48}
                    y1={from.y + 28}
                    x2={to.x + 48}
                    y2={to.y + 28}
                    className="network-edge-line"
                  />
                );
              })}
            </svg>

            {activeMap.nodes.map((node) => {
              const Icon = nodeIcons[node.type];
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`network-node ${selectedNodeId === node.id ? "selected" : ""} ${linkFromId === node.id ? "linking" : ""}`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => handleNodeClick(node)}
                  onMouseDown={(e) => {
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    dragRef.current = { id: node.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                    setSelectedNodeId(node.id);
                  }}
                >
                  <span className="network-node-icon">
                    <Icon size={16} />
                  </span>
                  <strong>{node.label}</strong>
                  {node.ip ? <small>{node.ip}</small> : null}
                </button>
              );
            })}
          </div>

          <aside className="network-inspector">
            {selectedNode ? (
              <>
                <h3>Свойства узла</h3>
                <label className="field-label">Название</label>
                <input
                  className="text-field"
                  value={selectedNode.label}
                  onChange={(e) => updateSelectedNode({ label: e.target.value })}
                />
                <label className="field-label">IP / адрес</label>
                <input
                  className="text-field"
                  value={selectedNode.ip ?? ""}
                  onChange={(e) => updateSelectedNode({ ip: e.target.value })}
                />
                <label className="field-label">Тип</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => updateSelectedNode({ type: e.target.value as NetworkNode["type"] })}
                >
                  {networkNodeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="field-label">Заметка</label>
                <textarea
                  className="text-field"
                  rows={3}
                  value={selectedNode.notes ?? ""}
                  onChange={(e) => updateSelectedNode({ notes: e.target.value })}
                />
                <button
                  type="button"
                  className="ghost-button full danger"
                  onClick={() => removeNode(selectedNode.id)}
                >
                  <Trash2 size={14} />
                  Удалить узел
                </button>
              </>
            ) : (
              <p className="network-inspector-empty">Выберите узел на карте или создайте связь между двумя узлами.</p>
            )}
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