import type { NetworkEdge, NetworkMap, NetworkNode } from "./facility-types";

export const GRID_SIZE = 24;
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 56;

export function snapToGrid(value: number, grid = GRID_SIZE) {
  return Math.round(value / grid) * grid;
}

export function snapNode(node: NetworkNode): NetworkNode {
  return { ...node, x: Math.max(0, snapToGrid(node.x)), y: Math.max(0, snapToGrid(node.y)) };
}

export function edgeMidpoint(from: NetworkNode, to: NetworkNode) {
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y + NODE_HEIGHT / 2;
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

export type Viewport = { x: number; y: number; scale: number };

export function fitViewport(nodes: NetworkNode[], canvasWidth: number, canvasHeight: number): Viewport {
  if (!nodes.length) return { x: 40, y: 40, scale: 1 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.y + NODE_HEIGHT);
  }

  const padding = 48;
  const contentWidth = maxX - minX + padding * 2;
  const contentHeight = maxY - minY + padding * 2;
  const scale = Math.min(1.5, Math.max(0.35, Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight)));
  const x = (canvasWidth - contentWidth * scale) / 2 - (minX - padding) * scale;
  const y = (canvasHeight - contentHeight * scale) / 2 - (minY - padding) * scale;

  return { x, y, scale };
}

export function exportMapJson(map: NetworkMap) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    name: map.name,
    nodes: map.nodes,
    edges: map.edges,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${map.name.replace(/[^\wа-яА-ЯёЁ.-]+/gi, "_") || "network-map"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ImportedMapData = {
  name?: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

export function parseImportedMap(raw: string): ImportedMapData {
  const data = JSON.parse(raw) as {
    name?: string;
    nodes?: NetworkNode[];
    edges?: NetworkEdge[];
  };
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error("Неверный формат: нужны массивы nodes и edges");
  }
  return {
    name: typeof data.name === "string" ? data.name : undefined,
    nodes: data.nodes,
    edges: data.edges,
  };
}

export function filterNodes(nodes: NetworkNode[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  return nodes.filter((node) => {
    const haystack = [node.label, node.ip, node.hostname, node.mac, node.vlan, node.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}