import type { WorldMaterial } from "@/data/world";
import { voxelMaterialPalette } from "../materials/voxelMaterialPalette";

export const terrainImpactConfig = {
  maxDistance: 4,
  particlesPerBurst: 12,
  maxParticlesPerMaterial: 64,
  fragmentSize: 0.05,
  gravity: 6.4,
  burstVelocity: 1.05,
  randomVelocity: 0.75,
  angularVelocity: 8,
} as const;

export const terrainImpactMaterials = (Object.keys(voxelMaterialPalette) as WorldMaterial[]).filter(
  (material): material is Exclude<WorldMaterial, "cloud"> => material !== "cloud",
);
