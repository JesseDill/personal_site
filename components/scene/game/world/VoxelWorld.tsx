"use client";
import type { WorldBlock } from "@/data/world";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MaterialDefinition } from "../materials/types";
import { useVoxelTextures } from "../materials/useVoxelTextures";
import { voxelMaterialPalette, faceTexturePaths } from "../materials/voxelMaterialPalette";
import { buildChunkSurfaces, updateChunkIndex, surfaceGeometry, type Chunk, type ChunkIndex } from "../terrain/chunkGeometry";
import { countWork, timed } from "../performance/metrics";

const noRaycast = () => {};
type Materials = Map<string, THREE.Material>;
const ChunkMesh = memo(function ChunkMesh({ chunk, cells, materials }: { chunk: Chunk; cells: ReadonlyMap<string,WorldBlock>; materials: Materials }) {
  const surfaces = useMemo(() => timed("terrain.mesh", () => {
    countWork("chunkRebuilds");
    return buildChunkSurfaces(chunk,cells).map(surface => ({
      key: `${surface.material}:${surface.texturePath}`,
      geometry:surfaceGeometry(surface),
      material:materials.get(`${surface.material}:${surface.texturePath}`)!,
      definition:voxelMaterialPalette[surface.material] as MaterialDefinition,
      castShadow:surface.material !== "cloud",
    }));
    // A chunk object changes whenever it or its neighbors change. Other chunks stay untouched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chunk, materials]);
  useEffect(() => () => { for (const surface of surfaces) surface.geometry.dispose(); }, [surfaces]);
  return <group userData={{ voxelChunk:true }} dispose={null}>
    {surfaces.map(surface => <mesh key={surface.key} geometry={surface.geometry} material={surface.material}
      raycast={noRaycast} castShadow={surface.castShadow && !surface.definition.unlit} receiveShadow={!surface.definition.unlit} />)}
  </group>;
}, (a,b) => a.chunk === b.chunk && a.materials === b.materials);

export function VoxelWorld({ blocks }: { blocks: WorldBlock[] }) {
  const textures = useVoxelTextures();
  const committed = useRef<ChunkIndex>();
  const index = useMemo(() => timed("terrain.index", () => updateChunkIndex(committed.current, blocks)), [blocks]);
  useLayoutEffect(() => { committed.current = index; }, [index]);
  // One resource owner for the whole terrain. Chunk unmounts never dispose shared materials.
  const materials = useMemo(() => {
    const result: Materials = new Map();
    for (const [id, paths] of Object.entries(faceTexturePaths)) {
      const definition = voxelMaterialPalette[id as keyof typeof voxelMaterialPalette] as MaterialDefinition;
      for (const path of new Set(Object.values(paths))) {
        const common = {
          map:textures[path],
          color:definition.solidColor ?? "#ffffff",
          transparent:definition.transparent ?? false,
          alphaTest:definition.alphaTest ?? 0,
        };
        result.set(`${id}:${path}`, definition.unlit ? new THREE.MeshBasicMaterial({ ...common, toneMapped:false }) :
          new THREE.MeshStandardMaterial({ ...common, roughness:definition.roughness ?? 1, metalness:definition.metalness ?? 0,
            emissive:definition.emissive ?? "#000000", emissiveIntensity:definition.emissiveIntensity ?? 1 }));
      }
    }
    return result;
  }, [textures]);
  useEffect(() => () => { for (const material of materials.values()) material.dispose(); }, [materials]);
  return <>{[...index.chunks.values()].map(chunk => <ChunkMesh key={chunk.key} chunk={chunk} cells={index.cells} materials={materials} />)}</>;
}
