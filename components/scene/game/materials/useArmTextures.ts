import { usePixelTextures } from "./usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import { armFaceTexturePaths, armTextureDefinitions, uniqueArmTexturePaths } from "./armMaterials";
import { cubeFaceOrder } from "./types";

export function useArmTextures() {
  const textures = usePixelTextures(uniqueArmTexturePaths) as THREE.Texture[];


  const texturesByPath = useMemo(
    () =>
      Object.fromEntries(uniqueArmTexturePaths.map((path, index) => [path, textures[index]])) as Record<string, THREE.Texture>,
    [textures],
  );

  return useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(armTextureDefinitions) as Array<keyof typeof armTextureDefinitions>).map((part) => [
          part,
          cubeFaceOrder.map((face) => texturesByPath[armFaceTexturePaths[part][face]]),
        ]),
      ) as Record<keyof typeof armTextureDefinitions, THREE.Texture[]>,
    [texturesByPath],
  );
}
