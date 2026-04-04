"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import { configurePixelTexture } from "../materials/configurePixelTexture";

type SlabBlockProps = {
  position: [number, number, number];
  texturePath: string;
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
};

/** Half-height block (bottom slab); center at `position` (e.g. y=1.25 on ground). */
export function SlabBlock({ position, texturePath, fixturePrimaryId, terrainMaterial, breakPosition }: SlabBlockProps) {
  const texture = useTexture(texturePath) as THREE.Texture;

  useEffect(() => {
    configurePixelTexture(texture);
  }, [texture]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.95,
        metalness: 0,
      }),
    [texture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const hitUserData = useMemo(
    () => ({
      terrainMaterial,
      fixturePrimaryId,
      fixtureBreakPosition: breakPosition,
    }),
    [terrainMaterial, fixturePrimaryId, breakPosition],
  );

  return (
    <mesh castShadow receiveShadow position={position} material={material} userData={hitUserData}>
      <boxGeometry args={[1, 0.5, 1]} />
    </mesh>
  );
}
