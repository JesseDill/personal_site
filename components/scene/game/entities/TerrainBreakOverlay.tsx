"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { blockBreakHitsRequired, blockBreakTexturePaths, unbreakableTerrainMaterials } from "../config/mining";
import { terrainImpactConfig } from "../config/particles";
import { cubeFaceOrder } from "../materials/types";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import type { BreakableTerrainHit, TerrainBreakOverlayState } from "../types";
import { isTerrainRayHitSuppressed, type TerrainOccupancySnapshot } from "../terrain/occupancy";
import { getCenterTerrainHit } from "../terrain/raycastTerrain";
import type { WorldMaterial } from "@/data/world";

export function TerrainBreakOverlay({
  trigger,
  enabled,
  swingHeld,
  removedBlockKeys,
  onBreakBlock,
  shouldInterceptHit,
  onInterceptedHit,
  getOccupancySnapshot,
}: {
  trigger: number;
  enabled: boolean;
  swingHeld: boolean;
  removedBlockKeys: Set<string>;
  onBreakBlock: (block: BreakableTerrainHit) => void;
  shouldInterceptHit?: (blockKey: string, terrainMaterial: Exclude<WorldMaterial, "cloud">) => boolean;
  onInterceptedHit?: (block: BreakableTerrainHit) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const textures = useTexture(Array.from(blockBreakTexturePaths)) as THREE.Texture[];
  const [overlayState, setOverlayState] = useState<TerrainBreakOverlayState | null>(null);

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  useEffect(() => {
    if (!enabled || trigger === 0) return;

    const snapshot = getOccupancySnapshot();
    const terrainHit = getCenterTerrainHit(
      raycaster,
      camera,
      scene,
      terrainImpactConfig.maxDistance,
      snapshot,
    );

    if (!terrainHit || isTerrainRayHitSuppressed(snapshot, terrainHit.blockKey)) return;
    if (unbreakableTerrainMaterials.has(terrainHit.terrainMaterial)) {
      setOverlayState(null);
      return;
    }

    if (shouldInterceptHit?.(terrainHit.blockKey, terrainHit.terrainMaterial)) {
      onInterceptedHit?.({
        blockKey: terrainHit.blockKey,
        blockPosition: terrainHit.blockPosition,
        terrainMaterial: terrainHit.terrainMaterial,
      });
      setOverlayState(null);
      return;
    }

    setOverlayState((current) => {
      if (current?.blockKey === terrainHit.blockKey) {
        return {
          ...current,
          hits: current.hits + 1,
          blockPosition: terrainHit.blockPosition,
        };
      }

      return {
        blockKey: terrainHit.blockKey,
        blockPosition: terrainHit.blockPosition,
        terrainMaterial: terrainHit.terrainMaterial,
        hits: 1,
      };
    });
  }, [camera, enabled, getOccupancySnapshot, onInterceptedHit, raycaster, removedBlockKeys, scene, shouldInterceptHit, trigger]);

  useEffect(() => {
    const snapshot = getOccupancySnapshot();
    if (!overlayState || isTerrainRayHitSuppressed(snapshot, overlayState.blockKey)) return;
    if (unbreakableTerrainMaterials.has(overlayState.terrainMaterial)) {
      setOverlayState(null);
      return;
    }
    if (overlayState.hits < blockBreakHitsRequired[overlayState.terrainMaterial]) return;

    onBreakBlock({
      blockKey: overlayState.blockKey,
      blockPosition: overlayState.blockPosition,
      terrainMaterial: overlayState.terrainMaterial,
    });
    setOverlayState(null);
  }, [getOccupancySnapshot, onBreakBlock, overlayState, removedBlockKeys]);

  useFrame(() => {
    if (!enabled || !swingHeld) {
      setOverlayState((current) => (current ? null : current));
      return;
    }

    const snapshot = getOccupancySnapshot();
    const terrainHit = getCenterTerrainHit(
      raycaster,
      camera,
      scene,
      terrainImpactConfig.maxDistance,
      snapshot,
    );

    setOverlayState((current) => {
      if (!current) return current;
      if (isTerrainRayHitSuppressed(snapshot, current.blockKey) || !terrainHit || terrainHit.blockKey !== current.blockKey) {
        return null;
      }
      if (unbreakableTerrainMaterials.has(current.terrainMaterial) || unbreakableTerrainMaterials.has(terrainHit.terrainMaterial)) {
        return null;
      }

      if (
        current.blockPosition[0] !== terrainHit.blockPosition[0] ||
        current.blockPosition[1] !== terrainHit.blockPosition[1] ||
        current.blockPosition[2] !== terrainHit.blockPosition[2]
      ) {
        return {
          ...current,
          blockPosition: terrainHit.blockPosition,
        };
      }

      return current;
    });
  });

  if (!overlayState) return null;

  const hitsRequired = blockBreakHitsRequired[overlayState.terrainMaterial];
  const stage = Math.min(
    textures.length - 1,
    Math.floor(
      (Math.max(0, Math.min(overlayState.hits - 1, hitsRequired - 1)) / Math.max(1, hitsRequired - 1)) * textures.length,
    ),
  );
  const stageTexture = textures[stage];

  return (
    <mesh position={overlayState.blockPosition} scale={[1.018, 1.018, 1.018]} frustumCulled={false} renderOrder={4}>
      <boxGeometry args={[1, 1, 1]} />
      {cubeFaceOrder.map((face, index) => (
        <meshBasicMaterial
          key={`block-break-${face}-${stage}-${stageTexture.uuid}`}
          attach={`material-${index}`}
          map={stageTexture}
          color="#ffffff"
          transparent
          alphaTest={0.05}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          toneMapped={false}
        />
      ))}
    </mesh>
  );
}
