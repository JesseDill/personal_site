"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import { configurePixelTexture } from "../materials/configurePixelTexture";

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
    <group position={position} rotation={rotation} userData={hitUserData}>
      <mesh castShadow receiveShadow material={material} position={[0, -0.25, 0]}>
        <boxGeometry args={[1, 0.5, 1]} />
      </mesh>
      <mesh castShadow receiveShadow material={material} position={[0, 0.25, -0.25]}>
        <boxGeometry args={[1, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}
