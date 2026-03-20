"use client";

import type { WorldBlock, WorldMaterial } from "@/data/world";
import { useMemo } from "react";
import * as THREE from "three";
import { useVoxelTextures } from "../materials/useVoxelTextures";
import { cubeFaceOrder } from "../materials/types";
import { faceTexturePaths, voxelMaterialPalette } from "../materials/voxelMaterialPalette";
import { InstancedVoxelBlocks } from "./InstancedVoxelBlocks";
import { groupWorldBlocksByMaterial } from "./groupBlocksByMaterial";

export function VoxelWorld({ blocks }: { blocks: WorldBlock[] }) {
  const texturesByPath = useVoxelTextures();
  const groupedBlocks = useMemo(() => groupWorldBlocksByMaterial(blocks), [blocks]);
  const faceTexturesByMaterial = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(voxelMaterialPalette) as WorldMaterial[]).map((material) => [
          material,
          cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths[material][face]]),
        ]),
      ) as Record<WorldMaterial, THREE.Texture[]>,
    [texturesByPath],
  );

  return (
    <>
      {(Object.keys(groupedBlocks) as WorldMaterial[]).map((material) => (
        <InstancedVoxelBlocks
          key={material}
          materialId={material}
          positions={groupedBlocks[material]}
          material={voxelMaterialPalette[material]}
          faceTextures={faceTexturesByMaterial[material]}
          castShadow={material !== "cloud"}
        />
      ))}
    </>
  );
}
