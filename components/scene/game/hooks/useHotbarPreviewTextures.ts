import { usePixelTextures } from "../materials/usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import {
  collectedInventoryConfig,
  collectedInventoryMaterials,
  hotbarPreviewTexturePaths,
} from "../config/inventory";
import type { InventoryMaterial } from "../types";

export function useHotbarPreviewTextures() {
  const textures = usePixelTextures(hotbarPreviewTexturePaths) as THREE.Texture[];


  const texturesByPath = useMemo(
    () =>
      Object.fromEntries(hotbarPreviewTexturePaths.map((path, index) => [path, textures[index]])) as Record<
        string,
        THREE.Texture
      >,
    [textures],
  );

  return useMemo(() => {
    const out = {} as Record<InventoryMaterial, THREE.Texture[]>;
    for (const material of collectedInventoryMaterials) {
      const c = collectedInventoryConfig[material];
      if (c.renderKind === "voxelCube" && c.faceTextures) {
        out[material] = c.faceTextures.map((path) => texturesByPath[path]);
      } else if ("texturePath" in c && c.texturePath) {
        const t = texturesByPath[c.texturePath];
        out[material] = Array.from({ length: 6 }, () => t);
      } else {
        out[material] = [];
      }
    }
    return out;
  }, [texturesByPath]);
}
