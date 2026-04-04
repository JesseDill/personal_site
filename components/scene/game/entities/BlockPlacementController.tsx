"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import { worldBounds } from "@/data/world";
import { terrainImpactConfig } from "../config/particles";
import type { InventoryMaterial } from "../types";
import { blockIntersectsPlayerCapsule } from "../physics/collisionMath";
import { getAdjacentPlacementPositionFromHit, isTerrainBlockKeyOccupied } from "../terrain/occupancy";
import { getTerrainBlockKey } from "../terrain/blockKeys";
import { getCenterTerrainHit } from "../terrain/raycastTerrain";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";

export type PlacementFacingContext = {
  forwardX: number;
  forwardZ: number;
};

export function BlockPlacementController({
  enabled,
  heldInventoryMaterial,
  availableCount,
  onPlaceBlock,
  onPlaceSwing,
  getOccupancySnapshot,
}: {
  enabled: boolean;
  heldInventoryMaterial: InventoryMaterial | null;
  availableCount: number;
  onPlaceBlock: (
    material: InventoryMaterial,
    blockPosition: [number, number, number],
    facing: PlacementFacingContext,
  ) => void;
  onPlaceSwing: () => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const tryPlaceBlock = useCallback(() => {
    if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;

    const snapshot = getOccupancySnapshot();
    const terrainHit = getCenterTerrainHit(
      raycaster,
      camera,
      scene,
      terrainImpactConfig.maxDistance,
      snapshot,
    );
    if (!terrainHit) return;

    const blockPosition = getAdjacentPlacementPositionFromHit(terrainHit);
    const blockKey = getTerrainBlockKey(blockPosition);

    if (
      blockPosition[0] < worldBounds.minX ||
      blockPosition[0] > worldBounds.maxX ||
      blockPosition[2] < worldBounds.minZ ||
      blockPosition[2] > worldBounds.maxZ
    ) {
      return;
    }

    const isVoxelItem =
      heldInventoryMaterial === "dirt" ||
      heldInventoryMaterial === "wood" ||
      heldInventoryMaterial === "woodPlanks";

    if (isVoxelItem) {
      if (isTerrainBlockKeyOccupied(snapshot, blockKey) || blockIntersectsPlayerCapsule(blockPosition, camera.position)) {
        return;
      }
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    onPlaceBlock(heldInventoryMaterial, blockPosition, { forwardX: forward.x, forwardZ: forward.z });
    onPlaceSwing();
  }, [availableCount, camera, enabled, getOccupancySnapshot, heldInventoryMaterial, onPlaceBlock, onPlaceSwing, raycaster, scene]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;
      event.preventDefault();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) return;
      if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;

      event.preventDefault();
      tryPlaceBlock();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [availableCount, enabled, heldInventoryMaterial, tryPlaceBlock]);

  return null;
}
