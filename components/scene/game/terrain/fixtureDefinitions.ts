import type { WorldMaterial } from "@/data/world";
import { wellFenceCornerCells } from "@/data/world";
import type { FixtureKind, InventoryMaterial, PlacedFixture, SolidSegment } from "../types";

export type ShowcaseFixtureDefinition = {
  primaryId: string;
  fixtureKind: FixtureKind;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  /** Null = breakable showcase fixture that drops nothing (e.g. cobble). */
  dropMaterial: InventoryMaterial | null;
  breakPosition: [number, number, number];
  physicsSegments: SolidSegment[];
};

/**
 * Showcase fixtures: custom meshes + physics segments (single source of truth).
 * Must stay aligned with mounts in GameScene.
 */
export const showcaseFixtures: ShowcaseFixtureDefinition[] = [
  {
    primaryId: "fx:door:-3:4",
    fixtureKind: "door",
    terrainMaterial: "woodPlanks",
    dropMaterial: "woodenDoor",
    breakPosition: [-3, 2, 4],
    physicsSegments: [
      { bottom: 1.0, top: 2.0, cellX: -3, cellZ: 4, blockKey: "-3:1.5:4" },
      { bottom: 2.0, top: 3.0, cellX: -3, cellZ: 4, blockKey: "-3:2.5:4" },
    ],
  },
  {
    primaryId: "fx:stair:1:4",
    fixtureKind: "stair",
    terrainMaterial: "woodPlanks",
    dropMaterial: "woodenStair",
    breakPosition: [1, 1.5, 4],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 1, cellZ: 4, blockKey: "1:1.25:4" }],
  },
  {
    primaryId: "fx:stair:3:4",
    fixtureKind: "stair",
    terrainMaterial: "cobblestone",
    dropMaterial: null,
    breakPosition: [3, 1.5, 4],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 3, cellZ: 4, blockKey: "3:1.25:4" }],
  },
  {
    primaryId: "fx:slab:0:3",
    fixtureKind: "slab",
    terrainMaterial: "woodPlanks",
    dropMaterial: "woodenSlab",
    breakPosition: [0, 1.25, 3],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 0, cellZ: 3, blockKey: "0:1.25:3" }],
  },
  {
    primaryId: "fx:slab:2:3",
    fixtureKind: "slab",
    terrainMaterial: "cobblestone",
    dropMaterial: null,
    breakPosition: [2, 1.25, 3],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 2, cellZ: 3, blockKey: "2:1.25:3" }],
  },
  ...wellFenceCornerCells.map(([cellX, cellZ]) => {
    const primaryId = `fx:fence:well:${cellX}:${cellZ}`;
    return {
      primaryId,
      fixtureKind: "fence" as const,
      terrainMaterial: "woodPlanks" as const,
      dropMaterial: "woodenFence" as const,
      breakPosition: [cellX, 3.5, cellZ] as [number, number, number],
      physicsSegments: [
        { bottom: 2.0, top: 3.0, cellX, cellZ, blockKey: `${cellX}:2.5:${cellZ}` },
        { bottom: 3.0, top: 4.0, cellX, cellZ, blockKey: `${cellX}:3.5:${cellZ}` },
        { bottom: 4.0, top: 5.0, cellX, cellZ, blockKey: `${cellX}:4.5:${cellZ}` },
      ],
    } satisfies ShowcaseFixtureDefinition;
  }),
];

const fixtureByPrimaryId = new Map(showcaseFixtures.map((f) => [f.primaryId, f]));

const showcasePrimaryIdBySegmentBlockKey = new Map<string, string>();
for (const f of showcaseFixtures) {
  for (const seg of f.physicsSegments) {
    showcasePrimaryIdBySegmentBlockKey.set(seg.blockKey, f.primaryId);
  }
}

export function getShowcaseFixtureByPrimaryId(primaryId: string): ShowcaseFixtureDefinition | undefined {
  return fixtureByPrimaryId.get(primaryId);
}

/** Keys to add to `removedTerrainBlockKeys` when a fixture is fully broken (primary + all physics segment keys). */
export function getExpandedRemovalKeysForShowcaseFixture(blockKey: string): string[] | null {
  const byPrimary = fixtureByPrimaryId.get(blockKey);
  const fixture = byPrimary ?? (() => {
    const primaryId = showcasePrimaryIdBySegmentBlockKey.get(blockKey);
    return primaryId ? fixtureByPrimaryId.get(primaryId) : undefined;
  })();
  if (!fixture) return null;
  return [fixture.primaryId, ...fixture.physicsSegments.map((s) => s.blockKey)];
}

export function getShowcaseFixtureDropMaterial(blockKey: string): InventoryMaterial | null {
  const keys = getExpandedRemovalKeysForShowcaseFixture(blockKey);
  if (!keys) return null;
  const def = fixtureByPrimaryId.get(keys[0]);
  return def?.dropMaterial ?? null;
}

export function getExpandedRemovalKeysForPlacedFixture(blockKey: string, placed: PlacedFixture[]): string[] | null {
  for (const f of placed) {
    if (f.primaryId === blockKey) {
      return [f.primaryId, ...f.physicsSegments.map((s) => s.blockKey)];
    }
    if (f.physicsSegments.some((s) => s.blockKey === blockKey)) {
      return [f.primaryId, ...f.physicsSegments.map((s) => s.blockKey)];
    }
  }
  return null;
}

export function resolveFixtureRemovalKeys(blockKey: string, placedFixtures: PlacedFixture[]): string[] | null {
  return getExpandedRemovalKeysForShowcaseFixture(blockKey) ?? getExpandedRemovalKeysForPlacedFixture(blockKey, placedFixtures);
}

export function getFixtureDropMaterial(blockKey: string, placedFixtures: PlacedFixture[]): InventoryMaterial | null {
  const showcaseKeys = getExpandedRemovalKeysForShowcaseFixture(blockKey);
  if (showcaseKeys) {
    const def = fixtureByPrimaryId.get(showcaseKeys[0]);
    return def?.dropMaterial ?? null;
  }
  const placed = placedFixtures.find(
    (f) => f.primaryId === blockKey || f.physicsSegments.some((s) => s.blockKey === blockKey),
  );
  return placed?.dropMaterial ?? null;
}

/** @deprecated Use resolveFixtureRemovalKeys with placed fixtures; showcase-only break expansion. */
export function getExpandedRemovalKeysForBreak(blockKey: string): string[] | null {
  return getExpandedRemovalKeysForShowcaseFixture(blockKey);
}

export function getAllShowcaseFixturePhysicsSegments(): SolidSegment[] {
  return showcaseFixtures.flatMap((f) => f.physicsSegments);
}
