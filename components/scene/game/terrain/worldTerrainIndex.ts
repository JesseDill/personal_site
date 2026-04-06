import { worldBlocks } from "@/data/world";
import { getTerrainBlockKey } from "./blockKeys";
import { buildSolidColumnsFromBlocks } from "./solidColumns";
import { showcaseFixtures } from "./fixtureDefinitions";

export const worldTerrainBlockKeys = new Set(worldBlocks.map((block) => getTerrainBlockKey(block.position)));

export const worldSolidColumns = buildSolidColumnsFromBlocks(worldBlocks);

for (const f of showcaseFixtures) {
  if (f.fixtureKind === "door") continue;
  for (const seg of f.physicsSegments) {
    const key = `${seg.cellX}:${seg.cellZ}`;
    const col = worldSolidColumns.get(key) ?? [];
    col.push(seg);
    worldSolidColumns.set(key, col);
  }
}
