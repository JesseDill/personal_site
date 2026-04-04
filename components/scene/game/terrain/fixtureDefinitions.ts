import type { WorldMaterial } from "@/data/world";
import type { SolidSegment } from "../types";

export type ShowcaseFixtureDefinition = {
  primaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
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
    terrainMaterial: "woodPlanks",
    breakPosition: [-3, 2, 4],
    physicsSegments: [
      { bottom: 1.0, top: 2.0, cellX: -3, cellZ: 4, blockKey: "-3:1.5:4" },
      { bottom: 2.0, top: 3.0, cellX: -3, cellZ: 4, blockKey: "-3:2.5:4" },
    ],
  },
  {
    primaryId: "fx:stair:1:4",
    terrainMaterial: "woodPlanks",
    breakPosition: [1, 1.5, 4],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 1, cellZ: 4, blockKey: "1:1.25:4" }],
  },
  {
    primaryId: "fx:stair:3:4",
    terrainMaterial: "cobblestone",
    breakPosition: [3, 1.5, 4],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 3, cellZ: 4, blockKey: "3:1.25:4" }],
  },
  {
    primaryId: "fx:slab:0:3",
    terrainMaterial: "woodPlanks",
    breakPosition: [0, 1.25, 3],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 0, cellZ: 3, blockKey: "0:1.25:3" }],
  },
  {
    primaryId: "fx:slab:2:3",
    terrainMaterial: "cobblestone",
    breakPosition: [2, 1.25, 3],
    physicsSegments: [{ bottom: 1.0, top: 1.5, cellX: 2, cellZ: 3, blockKey: "2:1.25:3" }],
  },
  {
    primaryId: "fx:fence:-3:3",
    terrainMaterial: "woodPlanks",
    breakPosition: [-3, 1.5, 3],
    physicsSegments: [{ bottom: 1.0, top: 2.0, cellX: -3, cellZ: 3, blockKey: "-3:1.5:3" }],
  },
  {
    primaryId: "fx:fence:-2:3",
    terrainMaterial: "woodPlanks",
    breakPosition: [-2, 1.5, 3],
    physicsSegments: [{ bottom: 1.0, top: 2.0, cellX: -2, cellZ: 3, blockKey: "-2:1.5:3" }],
  },
  {
    primaryId: "fx:fence:-1:3",
    terrainMaterial: "woodPlanks",
    breakPosition: [-1, 1.5, 3],
    physicsSegments: [{ bottom: 1.0, top: 2.0, cellX: -1, cellZ: 3, blockKey: "-1:1.5:3" }],
  },
];

const fixtureByPrimaryId = new Map(showcaseFixtures.map((f) => [f.primaryId, f]));

export function getShowcaseFixtureByPrimaryId(primaryId: string): ShowcaseFixtureDefinition | undefined {
  return fixtureByPrimaryId.get(primaryId);
}

/** Keys to add to `removedTerrainBlockKeys` when a fixture is fully broken (primary + all physics segment keys). */
export function getExpandedRemovalKeysForBreak(blockKey: string): string[] | null {
  const fixture = fixtureByPrimaryId.get(blockKey);
  if (!fixture) return null;
  return [fixture.primaryId, ...fixture.physicsSegments.map((s) => s.blockKey)];
}

export function getAllShowcaseFixturePhysicsSegments(): SolidSegment[] {
  return showcaseFixtures.flatMap((f) => f.physicsSegments);
}
