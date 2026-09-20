import * as THREE from "three";
import type { WorldBlock, WorldMaterial } from "@/data/world";
import { voxelMaterialPalette, faceTexturePaths } from "../materials/voxelMaterialPalette";
import { cubeFaceOrder, type MaterialDefinition } from "../materials/types";

export const CHUNK_SIZE = 32;
export const blockKey = (p: readonly number[]) => p.join(":");
export const chunkKey = (p: readonly number[], size = CHUNK_SIZE) => p.map(v => Math.floor(v / size)).join(":");
export const neighborOffsets = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]] as const;
export type Chunk = { key: string; blocks: WorldBlock[]; signature: string };
export type ChunkIndex = { cells: Map<string, WorldBlock>; chunks: Map<string, Chunk> };
const definition = (material: WorldMaterial): MaterialDefinition => voxelMaterialPalette[material];

/** Reuse untouched chunk objects, including their mesh payloads. Inspect neighbors on edits. */
export function updateChunkIndex(previous: ChunkIndex | undefined, blocks: WorldBlock[], size = CHUNK_SIZE): ChunkIndex {
  const cells = new Map(blocks.map(block => [blockKey(block.position), block]));
  const dirty = new Set<string>();
  const mark = (block: WorldBlock) => {
    dirty.add(chunkKey(block.position, size));
    for (const offset of neighborOffsets) dirty.add(chunkKey(block.position.map((v,i) => v + offset[i]), size));
  };
  for (const [key, block] of cells) {
    const old = previous?.cells.get(key);
    if (!old || old.material !== block.material) mark(block);
  }
  for (const [key, old] of previous?.cells ?? []) if (!cells.has(key)) mark(old);
  const grouped = new Map<string, WorldBlock[]>();
  for (const block of blocks) {
    const key = chunkKey(block.position, size);
    if (!dirty.has(key) && previous?.chunks.has(key)) continue;
    const list = grouped.get(key) ?? []; list.push(block); grouped.set(key,list);
  }
  const chunks = new Map(previous?.chunks);
  for (const key of dirty) {
    const list = grouped.get(key);
    if (!list?.length) chunks.delete(key);
    else chunks.set(key, { key, blocks: list, signature: list.map(b => `${blockKey(b.position)}=${b.material}`).join(";") });
  }
  return { cells, chunks };
}

// Copy face attributes from Three's BoxGeometry so winding and UVs are exactly preserved.
const cube = new THREE.BoxGeometry(1,1,1);
const cubePositions = cube.getAttribute("position");
const cubeNormals = cube.getAttribute("normal");
const cubeUVs = cube.getAttribute("uv");
const cubeIndices = cube.index!;
export type SurfaceGroup = { material: WorldMaterial; texturePath: string; positions: number[]; normals: number[]; uvs: number[] };
export function buildChunkSurfaces(chunk: Chunk, cells: ReadonlyMap<string, WorldBlock>): SurfaceGroup[] {
  const groups = new Map<string, SurfaceGroup>();
  for (const block of chunk.blocks) {
    const own = definition(block.material);
    neighborOffsets.forEach((offset, face) => {
      const neighbor = cells.get(blockKey(block.position.map((v,i) => v + offset[i])));
      // Retain all transparent interfaces; their blending/cutouts must remain unchanged.
      // Preserve surfaces next to non-shadow-casters for the shadow pass as well.
      if (!own.transparent && neighbor && !definition(neighbor.material).transparent &&
          !!own.unlit === !!definition(neighbor.material).unlit) return;
      const texturePath = faceTexturePaths[block.material][cubeFaceOrder[face]];
      const key = `${block.material}:${texturePath}`;
      let group = groups.get(key);
      if (!group) { group = { material:block.material, texturePath, positions:[], normals:[], uvs:[] }; groups.set(key, group); }
      for (let j=0; j<6; j++) {
        const vertex = cubeIndices.getX(face*6+j);
        group.positions.push(cubePositions.getX(vertex)+block.position[0],cubePositions.getY(vertex)+block.position[1],cubePositions.getZ(vertex)+block.position[2]);
        group.normals.push(cubeNormals.getX(vertex),cubeNormals.getY(vertex),cubeNormals.getZ(vertex));
        group.uvs.push(cubeUVs.getX(vertex),cubeUVs.getY(vertex));
      }
    });
  }
  return [...groups.values()];
}
export function surfaceGeometry(surface: SurfaceGroup) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(surface.positions,3));
  geometry.setAttribute("normal",new THREE.Float32BufferAttribute(surface.normals,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(surface.uvs,2));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
