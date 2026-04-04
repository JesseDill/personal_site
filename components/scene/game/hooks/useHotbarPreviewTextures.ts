import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  collectedInventoryConfig,
  collectedInventoryMaterials,
  hotbarPreviewTexturePaths,
} from "../config/inventory";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import type { InventoryMaterial } from "../types";

export function useHotbarPreviewTextures() {
  const textures = useTexture(hotbarPreviewTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

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
