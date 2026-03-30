import type * as THREE from "three";
import type { WorldMaterial } from "@/data/world";

export type SolidSegment = {
  bottom: number;
  top: number;
  cellX: number;
  cellZ: number;
  blockKey: string;
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
  material: "dirt" | "wood";
  blockPosition: [number, number, number];
  spawnedAt: number;
  phase: number;
  drift: [number, number];
};

/** One inventory cell: stacked items of a single material, or empty. */
export type InventorySlot = {
  material: DroppedBlockItem["material"];
  count: number;
} | null;

export type TerrainBreakOverlayState = {
  blockKey: string;
  blockPosition: [number, number, number];
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  hits: number;
};
