import { assetPath } from "@/lib/assetPrefix";
import type { FixtureKind, InventoryMaterial, PlacedFixture, SolidSegment } from "../types";

export const WOOD_PLANKS_TEXTURE = assetPath("/textures/world/wood-planks.svg");
export const DOOR_TEXTURE = assetPath("/textures/world/door.svg");

function makePlacedFixtureId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pf:${crypto.randomUUID()}`;
  }
  return `pf:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function physicsSegmentsForFixture(
  kind: FixtureKind,
  cellX: number,
  cellZ: number,
): SolidSegment[] {
  switch (kind) {
    case "slab":
      return [{ bottom: 1.0, top: 1.5, cellX, cellZ, blockKey: `${cellX}:1.25:${cellZ}` }];
    case "stair":
      return [{ bottom: 1.0, top: 1.5, cellX, cellZ, blockKey: `${cellX}:1.25:${cellZ}` }];
    case "fence":
      return [{ bottom: 1.0, top: 2.0, cellX, cellZ, blockKey: `${cellX}:1.5:${cellZ}` }];
    case "door":
      return [
        { bottom: 1.0, top: 2.0, cellX, cellZ, blockKey: `${cellX}:1.5:${cellZ}` },
        { bottom: 2.0, top: 3.0, cellX, cellZ, blockKey: `${cellX}:2.5:${cellZ}` },
      ];
    default:
      return [];
  }
}

export function breakPositionForFixture(
  kind: FixtureKind,
  cellX: number,
  cellZ: number,
): [number, number, number] {
  switch (kind) {
    case "slab":
      return [cellX, 1.25, cellZ];
    case "stair":
      return [cellX, 1.5, cellZ];
    case "fence":
      return [cellX, 1.5, cellZ];
    case "door":
      return [cellX, 2, cellZ];
    default:
      return [cellX, 1.5, cellZ];
  }
}

const DROP_BY_KIND: Record<FixtureKind, InventoryMaterial> = {
  slab: "woodenSlab",
  stair: "woodenStair",
  fence: "woodenFence",
  door: "woodenDoor",
};

export function createPlacedFixture(
  kind: FixtureKind,
  cellX: number,
  cellZ: number,
  rotationY: number,
): PlacedFixture {
  return {
    primaryId: makePlacedFixtureId(),
    fixtureKind: kind,
    terrainMaterial: "woodPlanks",
    dropMaterial: DROP_BY_KIND[kind],
    breakPosition: breakPositionForFixture(kind, cellX, cellZ),
    physicsSegments: physicsSegmentsForFixture(kind, cellX, cellZ),
    rotationY,
    texturePath: kind === "door" ? DOOR_TEXTURE : WOOD_PLANKS_TEXTURE,
  };
}

/** Dominant horizontal facing from camera forward (XZ), for stair/fence/door rotation. */
export function rotationYFromCameraForward(forwardX: number, forwardZ: number): number {
  const ax = Math.abs(forwardX);
  const az = Math.abs(forwardZ);
  if (ax >= az) {
    return forwardX >= 0 ? 0 : Math.PI;
  }
  return forwardZ >= 0 ? Math.PI / 2 : -Math.PI / 2;
}
