import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  collectedInventoryConfig,
  collectedInventoryMaterials,
  hotbarPreviewTexturePaths,
} from "../config/inventory";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import type { DroppedBlockItem } from "../types";

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

  return useMemo(
    () =>
      Object.fromEntries(
        collectedInventoryMaterials.map((material) => [
          material,
          collectedInventoryConfig[material].faceTextures.map((path) => texturesByPath[path]),
        ]),
      ) as Record<DroppedBlockItem["material"], THREE.Texture[]>,
    [texturesByPath],
  );
}
