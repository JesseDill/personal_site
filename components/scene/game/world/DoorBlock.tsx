"use client";

import { usePixelTextures } from "../materials/usePixelTextures";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SharedBoxGeometry } from "../materials/sharedResources";
import type { WorldMaterial } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";
import { DOOR_Y_MAX, DOOR_Y_MIN, getDoorMeshSpec } from "../terrain/doorCollision";

type DoorBlockProps = {
  position: [number, number, number];
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
  /** Facing / hinge alignment (radians around Y). */
  rotationY?: number;
  /** Swung open 90° from closed. */
  isOpen?: boolean;
  /** World-space door slab vertical extent (default 1–3). */
  doorYMin?: number;
  doorYMax?: number;
};

/** Thin door slab; mesh bounds match `getDoorSlabBounds` (always inside the door cell). */
export function DoorBlock({
  position,
  fixturePrimaryId,
  terrainMaterial,
  breakPosition,
  rotationY = 0,
  isOpen = false,
  doorYMin = DOOR_Y_MIN,
  doorYMax = DOOR_Y_MAX,
}: DoorBlockProps) {
  const texture = usePixelTextures(assetPath("/textures/world/door.svg")) as THREE.Texture;


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
    () => getDoorMeshSpec(breakPosition, rotationY, isOpen, doorYMin, doorYMax),
    [breakPosition, rotationY, isOpen, doorYMin, doorYMax],
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
        <SharedBoxGeometry args={size} />
      </mesh>
    </group>
  );
}
