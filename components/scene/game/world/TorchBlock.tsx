"use client";

import { useEffect, useMemo } from "react";
import type { WorldMaterial } from "@/data/world";
import * as THREE from "three";

/** Footprint (original cube width/depth). */
const TORCH_W = 0.125;
const TORCH_D = 0.125;
/** Triple the original 0.125 cube height. */
const TORCH_HEIGHT = 0.375;
/** Upper flame segment keeps the original cube height; shaft is the rest (non-emissive). */
const FLAME_HEIGHT = 0.125;
const SHAFT_HEIGHT = TORCH_HEIGHT - FLAME_HEIGHT;

/** ~14-block falloff radius; peak brightness kept low vs earlier torches. */
const LIGHT_DISTANCE = 14;
const LIGHT_DECAY = 1;
const LIGHT_INTENSITY = 2.25;
const LIGHT_COLOR = "#ffcc88";

type TorchBlockProps = {
  position: [number, number, number];
  fixturePrimaryId?: string;
  terrainMaterial?: string;
  breakPosition?: [number, number, number];
};

/**
 * Torch fixture: rectangular shaft (no emissive) with a small emissive cap + point light at the top.
 * When `fixturePrimaryId` is provided, `userData` is set on every mesh so the raycast breaking
 * pipeline can resolve hits and route them through the fixture removal system.
 */
export function TorchBlock({ position, fixturePrimaryId, terrainMaterial, breakPosition }: TorchBlockProps) {
  const shaftMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5c4033",
        roughness: 0.95,
        metalness: 0,
      }),
    [],
  );

  const flameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LIGHT_COLOR,
        emissive: LIGHT_COLOR,
        emissiveIntensity: 0.75,
        roughness: 0.9,
        metalness: 0,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      shaftMaterial.dispose();
      flameMaterial.dispose();
    };
  }, [flameMaterial, shaftMaterial]);

  const halfH = TORCH_HEIGHT / 2;
  const shaftCenterY = -halfH + SHAFT_HEIGHT / 2;
  const flameCenterY = -halfH + SHAFT_HEIGHT + FLAME_HEIGHT / 2;
  const lightY = halfH;

  const hitUserData = useMemo(
    () =>
      fixturePrimaryId
        ? {
            terrainMaterial: (terrainMaterial ?? "torch") as Exclude<WorldMaterial, "cloud">,
            fixturePrimaryId,
            fixtureBreakPosition: breakPosition ?? position,
          }
        : undefined,
    [fixturePrimaryId, terrainMaterial, breakPosition, position],
  );

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, shaftCenterY, 0]} material={shaftMaterial} userData={hitUserData ?? {}}>
        <boxGeometry args={[TORCH_W, SHAFT_HEIGHT, TORCH_D]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, flameCenterY, 0]} material={flameMaterial} userData={hitUserData ?? {}}>
        <boxGeometry args={[TORCH_W, FLAME_HEIGHT, TORCH_D]} />
      </mesh>
      <pointLight
        position={[0, lightY, 0]}
        color={LIGHT_COLOR}
        intensity={LIGHT_INTENSITY}
        distance={LIGHT_DISTANCE}
        decay={LIGHT_DECAY}
        castShadow={false}
      />
    </group>
  );
}
