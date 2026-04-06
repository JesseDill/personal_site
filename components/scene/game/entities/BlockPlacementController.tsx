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
import { getCenterTerrainHit, getDoorTogglePrimaryId } from "../terrain/raycastTerrain";
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
  onRightClickSwing,
  onToggleDoor,
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
  /** Non-breaking arm swing on every right click in explore mode. */
  onRightClickSwing: () => void;
  onToggleDoor: (primaryId: string) => void;
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
  }, [availableCount, camera, enabled, getOccupancySnapshot, heldInventoryMaterial, onPlaceBlock, raycaster, scene]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (!enabled) return;
      event.preventDefault();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) return;
      if (!enabled) return;

      event.preventDefault();
      onRightClickSwing();

      const snapshot = getOccupancySnapshot();
      const doorId = getDoorTogglePrimaryId(
        raycaster,
        camera,
        scene,
        terrainImpactConfig.maxDistance,
        snapshot,
      );
      if (doorId) {
        onToggleDoor(doorId);
        return;
      }

      if (!heldInventoryMaterial || availableCount <= 0) return;
      tryPlaceBlock();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [
    availableCount,
    camera,
    enabled,
    getOccupancySnapshot,
    heldInventoryMaterial,
    onRightClickSwing,
    onToggleDoor,
    raycaster,
    scene,
    tryPlaceBlock,
  ]);

  return null;
}
