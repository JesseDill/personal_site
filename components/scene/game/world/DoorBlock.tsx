"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import { getDoorMeshSpec } from "../terrain/doorCollision";

type DoorBlockProps = {
  position: [number, number, number];
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
  /** Facing / hinge alignment (radians around Y). */
  rotationY?: number;
  /** Swung open 90° from closed. */
  isOpen?: boolean;
};

/** Thin 2-block-tall door; mesh bounds match `getDoorSlabBounds` (always inside the door cell). */
export function DoorBlock({
  position,
  fixturePrimaryId,
  terrainMaterial,
  breakPosition,
  rotationY = 0,
  isOpen = false,
}: DoorBlockProps) {
  const texture = useTexture(assetPath("/textures/world/door.svg")) as THREE.Texture;

  useEffect(() => {
    configurePixelTexture(texture);
  }, [texture]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [texture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const { offset, size } = useMemo(
    () => getDoorMeshSpec(breakPosition, rotationY, isOpen),
    [breakPosition, rotationY, isOpen],
  );

  const hitUserData = useMemo(
    () => ({
      terrainMaterial,
      fixturePrimaryId,
      fixtureBreakPosition: breakPosition,
      fixtureKind: "door" as const,
    }),
    [terrainMaterial, fixturePrimaryId, breakPosition],
  );

  return (
    <group position={position} userData={hitUserData}>
      <mesh castShadow receiveShadow material={material} position={offset} userData={hitUserData}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  );
}
