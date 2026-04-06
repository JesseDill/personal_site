import type * as THREE from "three";
import type { WorldMaterial } from "@/data/world";

/** Collectable / placeable inventory item ids (voxels + wooden fixtures). */
export type InventoryMaterial =
  | "dirt"
  | "wood"
  | "woodPlanks"
  | "woodenSlab"
  | "woodenStair"
  | "woodenFence"
  | "woodenDoor";

export type SolidSegment = {
  bottom: number;
  top: number;
  cellX: number;
  cellZ: number;
  blockKey: string;
};

export type FixtureKind = "door" | "stair" | "slab" | "fence";

/** Player-placed slab / stair / fence / door (runtime state). */
export type PlacedFixture = {
  primaryId: string;
  fixtureKind: FixtureKind;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  dropMaterial: InventoryMaterial;
  breakPosition: [number, number, number];
  physicsSegments: SolidSegment[];
  rotationY: number;
  /** Slab / stair / fence wood texture; door ignores and uses door.svg */
  texturePath: string;
  /** Wooden doors only: swung open (90°) vs closed. */
  isOpen?: boolean;
};

/** World-space axis-aligned bounds for thin door collision (separate from full-cell SolidSegment columns). */
export type DoorObstacle = {
  primaryId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type CenterTerrainHit = {
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  blockPosition: [number, number, number];
  blockKey: string;
};

export type BreakableTerrainHit = Pick<CenterTerrainHit, "blockKey" | "blockPosition" | "terrainMaterial">;

export type DroppedBlockItem = {
  id: string;
  material: InventoryMaterial;
  blockPosition: [number, number, number];
  spawnedAt: number;
  phase: number;
  drift: [number, number];
};

/** One inventory cell: stacked items of a single material, or empty. */
export type InventorySlot = {
  material: InventoryMaterial;
  count: number;
} | null;

export type WaterCell = {
  x: number;
  y: number;
  z: number;
  level: number;
  isSource: boolean;
};

export type TerrainBreakOverlayState = {
  blockKey: string;
  blockPosition: [number, number, number];
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  hits: number;
};
