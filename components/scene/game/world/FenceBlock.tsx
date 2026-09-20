"use client";

import { usePixelTextures } from "../materials/usePixelTextures";
import { useMemo } from "react";
import * as THREE from "three";
import { SharedBoxGeometry, useSharedFixtureMaterial } from "../materials/sharedResources";
import type { WorldMaterial } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";

type FenceBlockProps = {
  position: [number, number, number];
  fixturePrimaryId: string;
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  breakPosition: [number, number, number];
  /** Stacked full-height posts (1 = default single block). */
  stackLevels?: number;
  /** +Z */
  connectNorth?: boolean;
  /** -Z */
  connectSouth?: boolean;
  /** +X */
  connectEast?: boolean;
  /** -X */
  connectWest?: boolean;
};

/**
 * Center post (0.25 thick) with optional double rails toward connected neighbors.
 * `position` is cell center at y=1.5 (full block height).
 */
export function FenceBlock({
  position,
  fixturePrimaryId,
  terrainMaterial,
  breakPosition,
  stackLevels = 1,
  connectNorth,
  connectSouth,
  connectEast,
  connectWest,
}: FenceBlockProps) {
  const texture = usePixelTextures(assetPath("/textures/world/wood-planks.svg")) as THREE.Texture;


  const material = useSharedFixtureMaterial(texture);


  const hitUserData = useMemo(
    () => ({
      terrainMaterial,
      fixturePrimaryId,
      fixtureBreakPosition: breakPosition,
    }),
    [terrainMaterial, fixturePrimaryId, breakPosition],
  );

  const half = (stackLevels - 1) / 2;
  const railOffsets = Array.from({ length: stackLevels }, (_, i) => i - half);

  return (
    <group position={position} userData={hitUserData}>
      {railOffsets.map((oy) => (
        <group key={oy} position={[0, oy, 0]}>
          <mesh dispose={null} castShadow receiveShadow material={material}>
            <SharedBoxGeometry args={[0.25, 1, 0.25]} />
          </mesh>
          {connectEast ? (
            <>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0.3125, -0.25, 0]}>
                <SharedBoxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0.3125, 0.15, 0]}>
                <SharedBoxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
            </>
          ) : null}
          {connectWest ? (
            <>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[-0.3125, -0.25, 0]}>
                <SharedBoxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[-0.3125, 0.15, 0]}>
                <SharedBoxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
            </>
          ) : null}
          {connectNorth ? (
            <>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0, -0.25, 0.3125]}>
                <SharedBoxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0, 0.15, 0.3125]}>
                <SharedBoxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
            </>
          ) : null}
          {connectSouth ? (
            <>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0, -0.25, -0.3125]}>
                <SharedBoxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
              <mesh dispose={null} castShadow receiveShadow material={material} position={[0, 0.15, -0.3125]}>
                <SharedBoxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
            </>
          ) : null}
        </group>
      ))}
    </group>
  );
}
