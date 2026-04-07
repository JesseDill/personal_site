import type { WorldMaterial } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";

export const blockBreakTexturePaths = [
  assetPath("/textures/world/block-break-stage-1.svg"),
  assetPath("/textures/world/block-break-stage-2.svg"),
  assetPath("/textures/world/block-break-stage-3.svg"),
  assetPath("/textures/world/block-break-stage-4.svg"),
  assetPath("/textures/world/block-break-stage-5.svg"),
] as const;

export const blockBreakHitsRequired = {
  grass: 4,
  grassShade: 4,
  dirt: 4,
  bedrock: Number.MAX_SAFE_INTEGER,
  signStone: 10,
  spawnBoard: 10,
  path: 5,
  stone: 8,
  stoneDark: 9,
  wood: 6,
  glass: 2,
  woodPlanks: 5,
  cobblestone: 8,
  leaves: 2,
  aboutAccent: 10,
  resumeAccent: 10,
  projectsAccent: 10,
  researchAccent: 10,
  contactAccent: 10,
  farmland: 4,
  torch: 1,
} satisfies Record<Exclude<WorldMaterial, "cloud">, number>;

export const unbreakableTerrainMaterials = new Set<Exclude<WorldMaterial, "cloud">>([
  "bedrock",
  "stoneDark",
  "signStone",
  "spawnBoard",
]);

