import { worldBlocks } from "@/data/world";
import type { SolidSegment } from "../types";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";

export const worldTerrainBlockKeys = new Set(worldBlocks.map((block) => getTerrainBlockKey(block.position)));

export const worldSolidColumns = buildSolidColumnsFromBlocks(worldBlocks);

/** Collision for meshes not in `worldBlocks` (must match `DoorBlock` / `StairBlock` in GameScene). */
const fixtureSolidSegments: SolidSegment[] = [
  { bottom: 1.0, top: 2.0, cellX: -3, cellZ: 4, blockKey: "-3:1.5:4" },
  { bottom: 2.0, top: 3.0, cellX: -3, cellZ: 4, blockKey: "-3:2.5:4" },
  { bottom: 1.0, top: 1.5, cellX: 1, cellZ: 4, blockKey: "1:1.25:4" },
  { bottom: 1.0, top: 1.5, cellX: 3, cellZ: 4, blockKey: "3:1.25:4" },
];

for (const seg of fixtureSolidSegments) {
  const key = `${seg.cellX}:${seg.cellZ}`;
  const col = worldSolidColumns.get(key) ?? [];
  col.push(seg);
  worldSolidColumns.set(key, col);
}
