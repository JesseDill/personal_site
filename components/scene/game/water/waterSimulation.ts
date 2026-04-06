import type { WaterSource } from "@/data/world";
import type { WaterCell } from "../types";

export const MAX_WATER_LEVEL = 8;
export const WATER_TICK_INTERVAL_MS = 300;

const HORIZONTAL_NEIGHBORS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function waterCellKey(x: number, y: number, z: number): string {
  return `${Math.round(x)}:${y}:${Math.round(z)}`;
}

/**
 * Position of the cell center from a world-space point.
 * X/Z are integer-centered; Y uses the n+0.5 grid matching block positions.
 */
function cellCoords(x: number, y: number, z: number): [number, number, number] {
  return [Math.round(x), Math.floor(y) + 0.5, Math.round(z)];
}

/** Seed the initial water state from authored sources (no propagation; pool starts contained). */
export function initWaterCells(sources: readonly WaterSource[]): Map<string, WaterCell> {
  const cells = new Map<string, WaterCell>();
  for (const s of sources) {
    const [x, y, z] = s.position;
    cells.set(waterCellKey(x, y, z), { x, y, z, level: MAX_WATER_LEVEL, isSource: true });
  }
  return cells;
}

/**
 * Compute the ideal steady-state water from current active sources.
 * BFS propagation: downward flow resets to MAX_WATER_LEVEL; horizontal decrements by 1 per step.
 */
function computeIdealState(
  sources: WaterCell[],
  isCellSolid: (x: number, y: number, z: number) => boolean,
): Map<string, WaterCell> {
  const cells = new Map<string, WaterCell>();

  for (const s of sources) {
    cells.set(waterCellKey(s.x, s.y, s.z), { ...s, level: MAX_WATER_LEVEL });
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 200) {
    changed = false;
    iterations += 1;
    const snapshot = new Map(cells);

    for (const [, cell] of snapshot) {
      if (cell.level <= 0) continue;

      const belowY = cell.y - 1;
      if (!isCellSolid(cell.x, belowY, cell.z)) {
        const bk = waterCellKey(cell.x, belowY, cell.z);
        const ex = cells.get(bk);
        if (!ex || (!ex.isSource && ex.level < MAX_WATER_LEVEL)) {
          cells.set(bk, { x: cell.x, y: belowY, z: cell.z, level: MAX_WATER_LEVEL, isSource: false });
          changed = true;
        }
      }

      if (cell.level <= 1) continue;
      const sl = cell.level - 1;
      for (const [dx, dz] of HORIZONTAL_NEIGHBORS) {
        const nx = cell.x + dx;
        const nz = cell.z + dz;
        if (isCellSolid(nx, cell.y, nz)) continue;
        const nk = waterCellKey(nx, cell.y, nz);
        const ex = cells.get(nk);
        if (ex?.isSource) continue;
        if (ex && ex.level >= sl) continue;
        cells.set(nk, { x: nx, y: cell.y, z: nz, level: sl, isSource: false });
        changed = true;
      }
    }
  }

  return cells;
}

/**
 * Advance water one tick.
 * - Sources persist at MAX_WATER_LEVEL unless their cell is now solid.
 * - The ideal steady-state is recomputed from surviving sources.
 * - Cells in the ideal state adopt their ideal level instantly (fast spread).
 * - Cells NOT in the ideal state (lost source path) decay by 1 level per tick (gradual drain).
 */
export function tickWater(
  prev: ReadonlyMap<string, WaterCell>,
  isCellSolid: (x: number, y: number, z: number) => boolean,
): Map<string, WaterCell> {
  const activeSources: WaterCell[] = [];
  for (const cell of prev.values()) {
    if (cell.isSource && !isCellSolid(cell.x, cell.y, cell.z)) {
      activeSources.push(cell);
    }
  }

  const ideal = computeIdealState(activeSources, isCellSolid);
  const next = new Map<string, WaterCell>();

  for (const [key, cell] of ideal) {
    next.set(key, cell);
  }

  for (const [key, cell] of prev) {
    if (ideal.has(key)) continue;
    if (cell.isSource) continue;
    if (isCellSolid(cell.x, cell.y, cell.z)) continue;

    const decayed = cell.level - 1;
    if (decayed > 0) {
      next.set(key, { ...cell, level: decayed });
    }
  }

  return next;
}

/** Whether a world-space point is submerged inside a water cell. */
export function isPointInWater(
  cells: ReadonlyMap<string, WaterCell>,
  x: number,
  y: number,
  z: number,
): boolean {
  const [cx, cy, cz] = cellCoords(x, y, z);
  const cell = cells.get(waterCellKey(cx, cy, cz));
  if (!cell) return false;
  const surfaceY = cell.y - 0.5 + cell.level / MAX_WATER_LEVEL;
  return y >= cell.y - 0.5 && y < surfaceY;
}
