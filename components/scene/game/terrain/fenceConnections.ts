import { showcaseFixtures } from "./fixtureDefinitions";
import type { PlacedFixture } from "../types";

function isActiveFenceAt(
  cellX: number,
  cellZ: number,
  removedTerrainBlockKeys: Set<string>,
  placedFixtures: PlacedFixture[],
): boolean {
  for (const f of showcaseFixtures) {
    if (f.fixtureKind !== "fence") continue;
    if (removedTerrainBlockKeys.has(f.primaryId)) continue;
    const bx = Math.round(f.breakPosition[0]);
    const bz = Math.round(f.breakPosition[2]);
    if (bx === cellX && bz === cellZ) return true;
  }
  for (const p of placedFixtures) {
    if (p.fixtureKind !== "fence") continue;
    if (removedTerrainBlockKeys.has(p.primaryId)) continue;
    const bx = Math.round(p.breakPosition[0]);
    const bz = Math.round(p.breakPosition[2]);
    if (bx === cellX && bz === cellZ) return true;
  }
  return false;
}

/** FenceBlock props: `connectNorth` = +Z neighbor. */
export function fenceConnectionsAt(
  cellX: number,
  cellZ: number,
  removedTerrainBlockKeys: Set<string>,
  placedFixtures: PlacedFixture[],
): { connectNorth: boolean; connectSouth: boolean; connectEast: boolean; connectWest: boolean } {
  return {
    connectNorth: isActiveFenceAt(cellX, cellZ + 1, removedTerrainBlockKeys, placedFixtures),
    connectSouth: isActiveFenceAt(cellX, cellZ - 1, removedTerrainBlockKeys, placedFixtures),
    connectEast: isActiveFenceAt(cellX + 1, cellZ, removedTerrainBlockKeys, placedFixtures),
    connectWest: isActiveFenceAt(cellX - 1, cellZ, removedTerrainBlockKeys, placedFixtures),
  };
}
