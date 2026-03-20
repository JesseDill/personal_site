import type { WorldBlock, WorldMaterial } from "@/data/world";
import { voxelMaterialPalette } from "../materials/voxelMaterialPalette";

export function groupWorldBlocksByMaterial(blocks: WorldBlock[]) {
  const grouped = {} as Record<WorldMaterial, [number, number, number][]>;

  (Object.keys(voxelMaterialPalette) as WorldMaterial[]).forEach((material) => {
    grouped[material] = [];
  });

  blocks.forEach((block) => {
    grouped[block.material].push(block.position);
  });

  return grouped;
}
