import type { WorldBlock } from "@/data/world";
import type { SolidSegment } from "../types";
import { getTerrainBlockKey } from "./blockKeys";

export function buildSolidColumnsFromBlocks(blocks: WorldBlock[]) {
  return blocks.reduce<Map<string, SolidSegment[]>>((columns, block) => {
    if (!block.solid) return columns;

    const blockKey = getTerrainBlockKey(block.position);
    const key = `${Math.round(block.position[0])}:${Math.round(block.position[2])}`;
    const segments = columns.get(key) ?? [];
    segments.push({
      bottom: block.position[1] - 0.5,
      top: block.position[1] + 0.5,
      cellX: Math.round(block.position[0]),
      cellZ: Math.round(block.position[2]),
      blockKey,
    });
    columns.set(key, segments);
    return columns;
  }, new Map());
}
