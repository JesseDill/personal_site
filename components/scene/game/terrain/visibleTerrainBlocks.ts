import type { WorldBlock } from "@/data/world";
import { getTerrainBlockKey } from "./blockKeys";

export function composeVisibleTerrainBlocks(
  baseWorldBlocks: WorldBlock[],
  removedTerrainBlockKeys: Set<string>,
  placedTerrainBlocks: WorldBlock[],
): WorldBlock[] {
  return [
    ...baseWorldBlocks.filter((block) => !removedTerrainBlockKeys.has(getTerrainBlockKey(block.position))),
    ...placedTerrainBlocks,
  ];
}
