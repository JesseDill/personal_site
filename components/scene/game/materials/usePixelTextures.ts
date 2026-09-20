import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { configurePixelTexture } from "./configurePixelTexture";

export function usePixelTextures(paths: string[]): THREE.Texture[];
export function usePixelTextures(paths: string): THREE.Texture;
export function usePixelTextures(paths: string | string[]): THREE.Texture | THREE.Texture[] {
  const textures = useTexture(paths);
  // Runs before Drei's passive preupload, including when the caller changes texture paths.
  useLayoutEffect(() => {
    for (const texture of Array.isArray(textures) ? textures : [textures]) configurePixelTexture(texture);
  }, [textures]);
  return textures;
}
