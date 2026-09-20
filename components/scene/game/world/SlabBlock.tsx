"use client";

import { usePixelTextures } from "../materials/usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import { SharedBoxGeometry, useSharedFixtureMaterial } from "../materials/sharedResources";
import type { WorldMaterial } from "@/data/world";

type SlabBlockProps = {
  position: [number, number, number];
  texturePath: string;
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
};

/** Half-height block (bottom slab); center at `position` (e.g. y=1.25 on ground). */
export function SlabBlock({ position, texturePath, fixturePrimaryId, terrainMaterial, breakPosition }: SlabBlockProps) {
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
    <mesh dispose={null} castShadow receiveShadow position={position} material={material} userData={hitUserData}>
      <SharedBoxGeometry args={[1, 0.5, 1]} />
    </mesh>
  );
}
