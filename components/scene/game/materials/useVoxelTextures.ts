import { usePixelTextures } from "./usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import { uniqueVoxelTexturePaths } from "./voxelMaterialPalette";

export function useVoxelTextures() {
  const textures = usePixelTextures(uniqueVoxelTexturePaths) as THREE.Texture[];


  return useMemo(
    () =>
      Object.fromEntries(uniqueVoxelTexturePaths.map((path, index) => [path, textures[index]])) as Record<
        string,
        THREE.Texture
      >,
    [textures],
  );
}
