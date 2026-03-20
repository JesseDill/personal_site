import type { WorldBlock } from "@/data/world";
import type { CenterTerrainHit, SolidSegment } from "../types";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";
import { worldTerrainBlockKeys } from "./worldTerrainIndex";

export type TerrainOccupancySnapshot = {
  removedKeys: ReadonlySet<string>;
  placedBlocksByKey: ReadonlyMap<string, WorldBlock>;
  placedSolidColumns: ReadonlyMap<string, SolidSegment[]>;
};

export function createTerrainOccupancySnapshot(
  removedKeys: Set<string>,
  placedBlocks: WorldBlock[],
): TerrainOccupancySnapshot {
  const placedBlocksByKey = new Map<string, WorldBlock>();
  for (const block of placedBlocks) {
    placedBlocksByKey.set(getTerrainBlockKey(block.position), block);
  }

  return {
    removedKeys,
    placedBlocksByKey,
    placedSolidColumns: buildSolidColumnsFromBlocks(placedBlocks),
  };
}

export function getXZCellKey(cellX: number, cellZ: number) {
  return `${cellX}:${cellZ}`;
}

export function getMergedSolidSegmentsForCell(
  snapshot: TerrainOccupancySnapshot,
  baseColumns: ReadonlyMap<string, SolidSegment[]>,
  cellX: number,
  cellZ: number,
): SolidSegment[] {
  const key = getXZCellKey(cellX, cellZ);
  return [...(baseColumns.get(key) ?? []), ...(snapshot.placedSolidColumns.get(key) ?? [])];
}

/** Matches legacy raycast: removed from world and not replaced by a placed block at the same key. */
export function isTerrainRayHitSuppressed(snapshot: TerrainOccupancySnapshot, blockKey: string) {
  return snapshot.removedKeys.has(blockKey) && !snapshot.placedBlocksByKey.has(blockKey);
}

export function isTerrainBlockKeyOccupied(snapshot: TerrainOccupancySnapshot, blockKey: string) {
  return (
    snapshot.placedBlocksByKey.has(blockKey) ||
    (worldTerrainBlockKeys.has(blockKey) && !snapshot.removedKeys.has(blockKey))
  );
}

/** Legacy support / collision: skip segments whose block key is in the removed set. */
export function isSolidSegmentIgnoredForSupport(snapshot: TerrainOccupancySnapshot, segment: SolidSegment) {
  return snapshot.removedKeys.has(segment.blockKey);
}

export function getAdjacentPlacementPositionFromHit(hit: CenterTerrainHit): [number, number, number] {
  const absX = Math.abs(hit.normal.x);
  const absY = Math.abs(hit.normal.y);
  const absZ = Math.abs(hit.normal.z);

  if (absX >= absY && absX >= absZ) {
    return [hit.blockPosition[0] + Math.sign(hit.normal.x || 1), hit.blockPosition[1], hit.blockPosition[2]];
  }

  if (absY >= absX && absY >= absZ) {
    return [hit.blockPosition[0], hit.blockPosition[1] + Math.sign(hit.normal.y || 1), hit.blockPosition[2]];
  }

  return [hit.blockPosition[0], hit.blockPosition[1], hit.blockPosition[2] + Math.sign(hit.normal.z || 1)];
}
