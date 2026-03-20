import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { configurePixelTexture } from "./configurePixelTexture";
import { uniqueVoxelTexturePaths } from "./voxelMaterialPalette";

export function useVoxelTextures() {
  const textures = useTexture(uniqueVoxelTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  return useMemo(
    () =>
      Object.fromEntries(uniqueVoxelTexturePaths.map((path, index) => [path, textures[index]])) as Record<
        string,
        THREE.Texture
      >,
    [textures],
  );
}
