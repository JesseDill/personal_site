import type { DoorObstacle } from "../types";
import { showcaseFixtures } from "./fixtureDefinitions";
import type { PlacedFixture } from "../types";

/** Matches `boxGeometry` depth in DoorBlock (thin axis). */
export const DOOR_THICKNESS = 0.1875;

const DOOR_Y_MIN = 1;
const DOOR_Y_MAX = 3;

export type DoorFacing = "west" | "east" | "south" | "north";

/** Which cell edge the hinge sits on (matches `rotationYFromCameraForward` cardinals). */
export function classifyDoorFacing(rotationY: number): DoorFacing {
  const e = 0.08;
  const twoPi = Math.PI * 2;
  const n = ((rotationY % twoPi) + twoPi) % twoPi;
  if (n < e || Math.abs(n - twoPi) < e) return "west";
  if (Math.abs(n - Math.PI) < e) return "east";
  if (Math.abs(n - Math.PI / 2) < e) return "south";
  if (Math.abs(n - (3 * Math.PI) / 2) < e) return "north";
  return "west";
}

export type DoorSlabBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

function clampXZToCell(cellX: number, cellZ: number, minX: number, maxX: number, minZ: number, maxZ: number): DoorSlabBounds {
  const cxmin = cellX - 0.5;
  const cxmax = cellX + 0.5;
  const czmin = cellZ - 0.5;
  const czmax = cellZ + 0.5;
  return {
    minX: Math.max(cxmin, Math.min(minX, cxmax)),
    maxX: Math.min(cxmax, Math.max(maxX, cxmin)),
    minY: DOOR_Y_MIN,
    maxY: DOOR_Y_MAX,
    minZ: Math.max(czmin, Math.min(minZ, czmax)),
    maxZ: Math.min(czmax, Math.max(maxZ, czmin)),
  };
}

/**
 * Axis-aligned door slab fully inside the 1×1 cell `[cellX ± 0.5] × [cellZ ± 0.5]`.
 * Closed: 1 m wide along one axis, thin along the other (centered).
 * Open: 1 m wide along the perpendicular axis, thin slab flush to the hinge edge.
 */
export function getDoorSlabBounds(cellX: number, cellZ: number, rotationY: number, isOpen: boolean): DoorSlabBounds {
  const t = DOOR_THICKNESS;
  const cx = cellX;
  const cz = cellZ;
  const hxmin = cx - 0.5;
  const hxmax = cx + 0.5;
  const hzmin = cz - 0.5;
  const hzmax = cz + 0.5;
  const facing = classifyDoorFacing(rotationY);

  let minX: number;
  let maxX: number;
  let minZ: number;
  let maxZ: number;

  if (facing === "west") {
    if (!isOpen) {
      minX = hxmin;
      maxX = hxmax;
      minZ = cz - t / 2;
      maxZ = cz + t / 2;
    } else {
      minX = hxmin;
      maxX = hxmin + t;
      minZ = hzmin;
      maxZ = hzmax;
    }
  } else if (facing === "east") {
    if (!isOpen) {
      minX = hxmin;
      maxX = hxmax;
      minZ = cz - t / 2;
      maxZ = cz + t / 2;
    } else {
      minX = hxmax - t;
      maxX = hxmax;
      minZ = hzmin;
      maxZ = hzmax;
    }
  } else if (facing === "south") {
    if (!isOpen) {
      minZ = hzmin;
      maxZ = hzmax;
      minX = cx - t / 2;
      maxX = cx + t / 2;
    } else {
      minZ = hzmin;
      maxZ = hzmin + t;
      minX = hxmin;
      maxX = hxmax;
    }
  } else {
    if (!isOpen) {
      minZ = hzmin;
      maxZ = hzmax;
      minX = cx - t / 2;
      maxX = cx + t / 2;
    } else {
      minZ = hzmax - t;
      maxZ = hzmax;
      minX = hxmin;
      maxX = hxmax;
    }
  }

  return clampXZToCell(cellX, cellZ, minX, maxX, minZ, maxZ);
}

export function computeDoorObstacle(
  cellX: number,
  cellZ: number,
  rotationY: number,
  isOpen: boolean,
): DoorObstacle {
  const b = getDoorSlabBounds(cellX, cellZ, rotationY, isOpen);
  return {
    primaryId: "",
    minX: b.minX,
    maxX: b.maxX,
    minY: b.minY,
    maxY: b.maxY,
    minZ: b.minZ,
    maxZ: b.maxZ,
  };
}

/** Mesh position (relative to `breakPosition` group) and box size for rendering — same bounds as collision. */
export function getDoorMeshSpec(
  breakPosition: [number, number, number],
  rotationY: number,
  isOpen: boolean,
): { offset: [number, number, number]; size: [number, number, number] } {
  const cellX = Math.round(breakPosition[0]);
  const cellZ = Math.round(breakPosition[2]);
  const b = getDoorSlabBounds(cellX, cellZ, rotationY, isOpen);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  return {
    offset: [cx - breakPosition[0], cy - breakPosition[1], cz - breakPosition[2]],
    size: [b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ],
  };
}

export function collectDoorObstacles(
  removedKeys: ReadonlySet<string>,
  placedFixtures: PlacedFixture[],
  showcaseDoorOpen: Readonly<Record<string, boolean>>,
): DoorObstacle[] {
  const out: DoorObstacle[] = [];

  for (const f of showcaseFixtures) {
    if (f.fixtureKind !== "door") continue;
    if (removedKeys.has(f.primaryId)) continue;
    const cellX = Math.round(f.breakPosition[0]);
    const cellZ = Math.round(f.breakPosition[2]);
    const isOpen = Boolean(showcaseDoorOpen[f.primaryId]);
    const obs = computeDoorObstacle(cellX, cellZ, 0, isOpen);
    out.push({ ...obs, primaryId: f.primaryId });
  }

  for (const f of placedFixtures) {
    if (f.fixtureKind !== "door") continue;
    if (removedKeys.has(f.primaryId)) continue;
    const cellX = Math.round(f.breakPosition[0]);
    const cellZ = Math.round(f.breakPosition[2]);
    const isOpen = Boolean(f.isOpen);
    const obs = computeDoorObstacle(cellX, cellZ, f.rotationY, isOpen);
    out.push({ ...obs, primaryId: f.primaryId });
  }

  return out;
}
