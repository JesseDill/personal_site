import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { armFaceTexturePaths, armTextureDefinitions, uniqueArmTexturePaths } from "./armMaterials";
import { configurePixelTexture } from "./configurePixelTexture";
import { cubeFaceOrder } from "./types";

export function useArmTextures() {
  const textures = useTexture(uniqueArmTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

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
