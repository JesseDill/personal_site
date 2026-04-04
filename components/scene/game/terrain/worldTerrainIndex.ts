import { worldBlocks } from "@/data/world";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";
import { getAllShowcaseFixturePhysicsSegments } from "./fixtureDefinitions";

export const worldTerrainBlockKeys = new Set(worldBlocks.map((block) => getTerrainBlockKey(block.position)));

export const worldSolidColumns = buildSolidColumnsFromBlocks(worldBlocks);

for (const seg of getAllShowcaseFixturePhysicsSegments()) {
  const key = `${seg.cellX}:${seg.cellZ}`;
  const col = worldSolidColumns.get(key) ?? [];
  col.push(seg);
  worldSolidColumns.set(key, col);
}
