"use client";

import { usePixelTextures } from "../materials/usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import { SharedBoxGeometry, useSharedFixtureMaterial } from "../materials/sharedResources";
import type { WorldMaterial } from "@/data/world";

type StairBlockProps = {
  position: [number, number, number];
  texturePath: string;
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
  rotation?: [number, number, number];
};

export function StairBlock({
  position,
  texturePath,
  fixturePrimaryId,
  terrainMaterial,
  breakPosition,
  rotation = [0, 0, 0],
}: StairBlockProps) {
  const texture = usePixelTextures(texturePath) as THREE.Texture;


  const material = useSharedFixtureMaterial(texture);


  const hitUserData = useMemo(
    () => ({
      terrainMaterial,
      fixturePrimaryId,
      fixtureBreakPosition: breakPosition,
    }),
    [terrainMaterial, fixturePrimaryId, breakPosition],
  );

  return (
    <group position={position} rotation={rotation} userData={hitUserData}>
      <mesh dispose={null} castShadow receiveShadow material={material} position={[0, -0.25, 0]}>
        <SharedBoxGeometry args={[1, 0.5, 1]} />
      </mesh>
      <mesh dispose={null} castShadow receiveShadow material={material} position={[0, 0.25, -0.25]}>
        <SharedBoxGeometry args={[1, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}
