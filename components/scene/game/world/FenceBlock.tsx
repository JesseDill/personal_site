"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";
import { configurePixelTexture } from "../materials/configurePixelTexture";

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
  const texture = useTexture(assetPath("/textures/world/wood-planks.svg")) as THREE.Texture;

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

  const half = (stackLevels - 1) / 2;
  const railOffsets = Array.from({ length: stackLevels }, (_, i) => i - half);

  return (
    <group position={position} userData={hitUserData}>
      {railOffsets.map((oy) => (
        <group key={oy} position={[0, oy, 0]}>
          <mesh castShadow receiveShadow material={material}>
            <boxGeometry args={[0.25, 1, 0.25]} />
          </mesh>
          {connectEast ? (
            <>
              <mesh castShadow receiveShadow material={material} position={[0.3125, -0.25, 0]}>
                <boxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
              <mesh castShadow receiveShadow material={material} position={[0.3125, 0.15, 0]}>
                <boxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
            </>
          ) : null}
          {connectWest ? (
            <>
              <mesh castShadow receiveShadow material={material} position={[-0.3125, -0.25, 0]}>
                <boxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
              <mesh castShadow receiveShadow material={material} position={[-0.3125, 0.15, 0]}>
                <boxGeometry args={[0.375, 0.125, 0.125]} />
              </mesh>
            </>
          ) : null}
          {connectNorth ? (
            <>
              <mesh castShadow receiveShadow material={material} position={[0, -0.25, 0.3125]}>
                <boxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
              <mesh castShadow receiveShadow material={material} position={[0, 0.15, 0.3125]}>
                <boxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
            </>
          ) : null}
          {connectSouth ? (
            <>
              <mesh castShadow receiveShadow material={material} position={[0, -0.25, -0.3125]}>
                <boxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
              <mesh castShadow receiveShadow material={material} position={[0, 0.15, -0.3125]}>
                <boxGeometry args={[0.125, 0.125, 0.375]} />
              </mesh>
            </>
          ) : null}
        </group>
      ))}
    </group>
  );
}
