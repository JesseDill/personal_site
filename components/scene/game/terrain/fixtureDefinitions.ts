import type { WorldMaterial } from "@/data/world";
import { authoredWorldTorches, wellFenceCornerCells } from "@/data/world";
import type { FixtureKind, InventoryMaterial, PlacedFixture, SolidSegment } from "../types";

export type ShowcaseFixtureDefinition = {
  primaryId: string;
  fixtureKind: FixtureKind;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  /** Null = breakable showcase fixture that drops nothing (e.g. cobble). */
  dropMaterial: InventoryMaterial | null;
  breakPosition: [number, number, number];
  physicsSegments: SolidSegment[];
  /** Showcase doors only: Y rotation for collision/mesh (matches DoorBlock). */
  doorRotationY?: number;
  /** Showcase doors only: world-space vertical extent (default 1–3). */
  doorYMin?: number;
  doorYMax?: number;
};

/**
 * Showcase fixtures: custom meshes + physics segments (single source of truth).
 * Must stay aligned with mounts in GameScene.
 */
export const showcaseFixtures: ShowcaseFixtureDefinition[] = [
  {
    primaryId: "fx:door:home:5:-9",
    fixtureKind: "door",
    terrainMaterial: "woodPlanks",
    dropMaterial: "woodenDoor",
    breakPosition: [5, 3, -9],
    doorRotationY: 0,
    doorYMin: 1,
    doorYMax: 5,
    physicsSegments: [
      { bottom: 1.0, top: 2.0, cellX: 5, cellZ: -9, blockKey: "5:1.5:-9" },
      { bottom: 2.0, top: 3.0, cellX: 5, cellZ: -9, blockKey: "5:2.5:-9" },
      { bottom: 3.0, top: 4.0, cellX: 5, cellZ: -9, blockKey: "5:3.5:-9" },
      { bottom: 4.0, top: 5.0, cellX: 5, cellZ: -9, blockKey: "5:4.5:-9" },
    ],
  },
  {
    primaryId: "fx:stair:home:4:-9",
    fixtureKind: "stair",
    terrainMaterial: "cobblestone",
    dropMaterial: null,
    breakPosition: [4, 1.5, -9],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 4, cellZ: -9, blockKey: "4:1.25:-9" }],
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
  ...authoredWorldTorches.map(([x, y, z], i) => {
    const cx = Math.round(x);
    const cz = Math.round(z);
    return {
      primaryId: `fx:torch:${cx}:${cz}:${i}`,
      fixtureKind: "torch" as const,
      terrainMaterial: "torch" as const,
      dropMaterial: "torch" as const,
      breakPosition: [x, y, z] as [number, number, number],
      physicsSegments: [
        { bottom: y - 0.1875, top: y + 0.1875, cellX: cx, cellZ: cz, blockKey: `${cx}:${y}:${cz}` },
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

type TorchSupportFixture = { fixtureKind: FixtureKind; physicsSegments: SolidSegment[] };

/**
 * Terrain block key (voxel center) of the full cell the torch rests on.
 * Assumes the torch segment `bottom` is the support surface top and voxels are 1 unit tall (center ± 0.5).
 */
export function getTorchSupportTerrainBlockKey(fixture: TorchSupportFixture): string | null {
  if (fixture.fixtureKind !== "torch") return null;
  const seg = fixture.physicsSegments[0];
  if (!seg) return null;
  const supportCenterY = seg.bottom - 0.5;
  return `${seg.cellX}:${supportCenterY}:${seg.cellZ}`;
}

export type TorchDetachedBySupport = {
  primaryId: string;
  removalKeys: string[];
  dropMaterial: InventoryMaterial | null;
  breakPosition: [number, number, number];
};

/** Torches (showcase + player-placed) sitting on the given terrain block — for cascade when support breaks. */
export function getTorchesDetachedBySupportBlockKey(
  supportBlockKey: string,
  placedFixtures: PlacedFixture[],
): { showcase: TorchDetachedBySupport[]; placed: PlacedFixture[] } {
  const showcase: TorchDetachedBySupport[] = [];
  for (const f of showcaseFixtures) {
    if (f.fixtureKind !== "torch") continue;
    if (getTorchSupportTerrainBlockKey(f) !== supportBlockKey) continue;
    showcase.push({
      primaryId: f.primaryId,
      removalKeys: [f.primaryId, ...f.physicsSegments.map((s) => s.blockKey)],
      dropMaterial: f.dropMaterial,
      breakPosition: f.breakPosition,
    });
  }
  const placed = placedFixtures.filter(
    (f) => f.fixtureKind === "torch" && getTorchSupportTerrainBlockKey(f) === supportBlockKey,
  );
  return { showcase, placed };
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
