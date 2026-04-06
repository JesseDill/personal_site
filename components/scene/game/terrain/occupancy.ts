import type { WorldBlock } from "@/data/world";
import type { CenterTerrainHit, DoorObstacle, PlacedFixture, SolidSegment } from "../types";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";
import { showcaseFixtures } from "./fixtureDefinitions";
import { collectDoorObstacles } from "./doorCollision";
import { worldTerrainBlockKeys } from "./worldTerrainIndex";

export type TerrainOccupancySnapshot = {
  removedKeys: ReadonlySet<string>;
  placedBlocksByKey: ReadonlyMap<string, WorldBlock>;
  placedSolidColumns: ReadonlyMap<string, SolidSegment[]>;
  /** Dynamic placed fixtures (slab/stair/fence/door) merged into support / collision — doors excluded (thin collision via doorObstacles). */
  placedFixtureSolidColumns: ReadonlyMap<string, SolidSegment[]>;
  /** Segment blockKeys for active (non-removed) fixtures — used for placement overlap checks. */
  activeFixtureBlockKeys: ReadonlySet<string>;
  /** Thin wooden door AABBs for player collision (closed and open poses). */
  doorObstacles: ReadonlyArray<DoorObstacle>;
};

function buildPlacedFixtureSolidColumns(fixtures: PlacedFixture[]): Map<string, SolidSegment[]> {
  const columns = new Map<string, SolidSegment[]>();
  for (const f of fixtures) {
    if (f.fixtureKind === "door") continue;
    for (const seg of f.physicsSegments) {
      const key = `${seg.cellX}:${seg.cellZ}`;
      const list = columns.get(key) ?? [];
      list.push(seg);
      columns.set(key, list);
    }
  }
  return columns;
}

function computeActiveFixtureBlockKeys(removedKeys: Set<string>, placedFixtures: PlacedFixture[]): Set<string> {
  const keys = new Set<string>();
  for (const f of showcaseFixtures) {
    if (removedKeys.has(f.primaryId)) continue;
    for (const s of f.physicsSegments) {
      keys.add(s.blockKey);
    }
  }
  for (const f of placedFixtures) {
    if (removedKeys.has(f.primaryId)) continue;
    for (const s of f.physicsSegments) {
      keys.add(s.blockKey);
    }
  }
  return keys;
}

export function createTerrainOccupancySnapshot(
  removedKeys: Set<string>,
  placedBlocks: WorldBlock[],
  placedFixtures: PlacedFixture[],
  showcaseDoorOpen: Record<string, boolean> = {},
): TerrainOccupancySnapshot {
  const placedBlocksByKey = new Map<string, WorldBlock>();
  for (const block of placedBlocks) {
    placedBlocksByKey.set(getTerrainBlockKey(block.position), block);
  }

  const doorObstacles = collectDoorObstacles(removedKeys, placedFixtures, showcaseDoorOpen);

  return {
    removedKeys,
    placedBlocksByKey,
    placedSolidColumns: buildSolidColumnsFromBlocks(placedBlocks),
    placedFixtureSolidColumns: buildPlacedFixtureSolidColumns(placedFixtures),
    activeFixtureBlockKeys: computeActiveFixtureBlockKeys(removedKeys, placedFixtures),
    doorObstacles,
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
  return [
    ...(baseColumns.get(key) ?? []),
    ...(snapshot.placedSolidColumns.get(key) ?? []),
    ...(snapshot.placedFixtureSolidColumns.get(key) ?? []),
  ];
}

/** Matches legacy raycast: removed from world and not replaced by a placed block at the same key. */
export function isTerrainRayHitSuppressed(snapshot: TerrainOccupancySnapshot, blockKey: string) {
  return snapshot.removedKeys.has(blockKey) && !snapshot.placedBlocksByKey.has(blockKey);
}

export function isTerrainBlockKeyOccupied(snapshot: TerrainOccupancySnapshot, blockKey: string) {
  return (
    snapshot.placedBlocksByKey.has(blockKey) ||
    (worldTerrainBlockKeys.has(blockKey) && !snapshot.removedKeys.has(blockKey)) ||
    snapshot.activeFixtureBlockKeys.has(blockKey)
  );
}

export function areFixtureSegmentsPlaceable(snapshot: TerrainOccupancySnapshot, segments: SolidSegment[]): boolean {
  for (const seg of segments) {
    if (isTerrainBlockKeyOccupied(snapshot, seg.blockKey)) return false;
  }
  return true;
}

/**
 * Whether a solid column segment should be ignored for player support / collision.
 * Mined world voxels stay in `removedKeys`; their segments must be skipped.
 * If the player replaces that voxel (same `blockKey`), the placed block must not be skipped — it would
 * still match `removedKeys`, so we treat any key present in `placedBlocksByKey` as authoritative.
 */
export function isSolidSegmentIgnoredForSupport(snapshot: TerrainOccupancySnapshot, segment: SolidSegment) {
  if (snapshot.placedBlocksByKey.has(segment.blockKey)) {
    return false;
  }
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
