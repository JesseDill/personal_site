import { worldBlocks } from "@/data/world";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";

export const worldTerrainBlockKeys = new Set(worldBlocks.map((block) => getTerrainBlockKey(block.position)));

export const worldSolidColumns = buildSolidColumnsFromBlocks(worldBlocks);
