import type { InteractionId } from "@/data/interactions";
import { assetPath } from "@/lib/assetPrefix";

export type WorldMaterial =
  | "grass"
  | "grassShade"
  | "dirt"
  | "bedrock"
  | "signStone"
  | "spawnBoard"
  | "path"
  | "stone"
  | "stoneDark"
  | "wood"
  | "glass"
  | "woodPlanks"
  | "cobblestone"
  | "leaves"
  | "aboutAccent"
  | "resumeAccent"
  | "projectsAccent"
  | "researchAccent"
  | "contactAccent"
  | "farmland"
  | "cloud";

export type WorldBlock = {
  position: [number, number, number];
  material: WorldMaterial;
  solid?: boolean;
};

export type WaterSource = {
  position: [number, number, number];
};

export type Landmark = {
  id: InteractionId;
  position: [number, number, number];
  label: string;
  subtitle: string;
  accent: Extract<WorldMaterial, `${string}Accent`>;
};

export const worldBounds = {
  minX: -18,
  maxX: 18,
  minZ: -27,
  maxZ: 8,
};

export const worldSky = {
  fogNear: 18,
  fogFar: 54,
  domeRadius: 160,
  cycle: {
    enabled: true,
    secondsPerDay: 150,
    startProgress: 0.22,
  },
  orbit: {
    axis: "z" as const,
    heightOffset: 12,
  },
  colors: {
    dayBackground: "#a7cfff",
    nightBackground: "#0d1730",
    dayFog: "#a7cfff",
    nightFog: "#18284d",
    dayDome: "#9ecfff",
    nightDome: "#142345",
  },
  lighting: {
    dayAmbient: 0.9,
    nightAmbient: 0.18,
    dayHemisphere: 0.45,
    nightHemisphere: 0.14,
    dayDirectional: 1.25,
    nightDirectional: 0.12,
    dayHemisphereColor: "#fdf3c3",
    nightHemisphereColor: "#5e70a6",
    dayGroundColor: "#4c5b38",
    nightGroundColor: "#172114",
    sunColor: "#fff3c4",
    moonColor: "#b7cbff",
  },
  sun: {
    texture: assetPath("/textures/sky/minecraft-sun.svg"),
    scale: [12, 12, 1] as [number, number, number],
    orbitRadius: 92,
    verticalRadius: 44,
  },
  moon: {
    texture: assetPath("/textures/sky/minecraft-moon.svg"),
    scale: [9, 9, 1] as [number, number, number],
    orbitRadius: 84,
    verticalRadius: 38,
  },
  cloudLayers: [
    {
      count: 1,
      height: 122,
      size: [12, 6, 9] as [number, number, number],
      spread: [150, 90] as [number, number],
      driftDirection: [1, 0.14] as [number, number],
      driftSpeed: 2.4,
      bobAmplitude: 0.45,
      opacity: 0.5,
      puffCount: 11,
      blockSize: 10.1,
      minSpacing: 42,
    },
    {
      count: 2,
      height: 120,
      size: [16, 7, 11] as [number, number, number],
      spread: [184, 110] as [number, number],
      driftDirection: [1, -0.08] as [number, number],
      driftSpeed: 1.35,
      bobAmplitude: 0.32,
      opacity: 0.5,
      puffCount: 8,
      blockSize: 10.5,
      minSpacing: 64,
    },

  ],
  stars: {
    count: 42,
    radius: 112,
    size: 0.85,
  },
};

export const landmarks: Landmark[] = [
  { id: "about", position: [0, 1.75, -5], label: "Open Spawn Cabin", subtitle: "About", accent: "aboutAccent" },
  { id: "resume", position: [0, 1.75, -11], label: "Open Resume Keep", subtitle: "Resume", accent: "resumeAccent" },
  {
    id: "projects",
    position: [8, 1.75, -12],
    label: "Enter Projects Forge",
    subtitle: "Projects",
    accent: "projectsAccent",
  },
  {
    id: "research",
    position: [-8, 1.75, -14],
    label: "Enter Research Lab",
    subtitle: "Research",
    accent: "researchAccent",
  },
  {
    id: "contact",
    position: [0, 1.75, -20],
    label: "Open Contact Portal",
    subtitle: "Contact",
    accent: "contactAccent",
  },
];

type TerrainZone = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Flat ground for spawn / billboard pocket only (billboard at z = 7). */
const flatTerrainZones: TerrainZone[] = [{ minX: -6, maxX: 6, minZ: -9, maxZ: 8 }];

function isInsideZone(x: number, z: number, zone: TerrainZone) {
  return x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;
}

function shouldKeepTerrainFlat(x: number, z: number) {
  return flatTerrainZones.some((zone) => isInsideZone(x, z, zone));
}

function terrainLevelsAt(x: number, z: number) {
  if (shouldKeepTerrainFlat(x, z)) {
    return 0;
  }

  const edgeBias = Number(Math.abs(x) >= 10) + Number(z <= -17) + Number(z >= 2);
  if (edgeBias === 0) {
    return 0;
  }

  const contour = Math.sin(x * 0.55) + Math.cos(z * 0.4) + Math.sin((x - z) * 0.28);
  let levels = contour > 0.25 ? 1 : 0;

  if (edgeBias >= 2 && contour > 1.1) {
    levels = 2;
  }

  if ((Math.abs(x) >= 14 || z <= -23) && contour > -0.15) {
    levels = Math.max(levels, 1);
  }

  return levels;
}

function addTerrainColumn(blocks: WorldBlock[], x: number, z: number) {
  const material: WorldMaterial = (x + z) % 2 === 0 ? "grass" : "grassShade";
  const levels = terrainLevelsAt(x, z);

  blocks.push({ position: [x, -0.5, z], material });

  for (let level = 1; level <= levels; level += 1) {
    blocks.push({
      position: [x, -0.5 + level, z],
      material,
      solid: true,
    });
  }
}

function addRect(
  blocks: WorldBlock[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y: number,
  material: WorldMaterial,
  solid = false,
) {
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      blocks.push({ position: [x, y, z], material, solid });
    }
  }
}

function addColumn(
  blocks: WorldBlock[],
  x: number,
  z: number,
  height: number,
  startY: number,
  material: WorldMaterial,
  solid = true,
) {
  for (let index = 0; index < height; index += 1) {
    blocks.push({ position: [x, startY + index, z], material, solid });
  }
}

/** Deterministic 32-bit mix for stable tree variation from world (x, z). */
function treeSeed2d(x: number, z: number) {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return h >>> 0;
}

function isBlockXZInWorldBounds(px: number, pz: number) {
  return px >= worldBounds.minX && px <= worldBounds.maxX && pz >= worldBounds.minZ && pz <= worldBounds.maxZ;
}

/** Horizontal radius per canopy layer: bell shape, ~5–7 blocks wide at the widest slice. */
function canopyLayerRadius(layerIndex: number, layerCount: number) {
  const mid = (layerCount - 1) / 2;
  const dist = Math.abs(layerIndex - mid);
  if (dist <= 0.5) return 3;
  if (dist <= 1.5) return 2;
  return 1;
}

/** Filled disk of leaf voxels at y, connected vertically through the trunk column above. */
function addTreeCanopyDisk(
  blocks: WorldBlock[],
  trunkX: number,
  trunkZ: number,
  y: number,
  radius: number,
  omitCenter: boolean,
) {
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dz = -radius; dz <= radius; dz += 1) {
      if (omitCenter && dx === 0 && dz === 0) continue;
      if (dx * dx + dz * dz > radius * radius) continue;
      const px = trunkX + dx;
      const pz = trunkZ + dz;
      if (!isBlockXZInWorldBounds(px, pz)) continue;
      blocks.push({ position: [px, y, pz], material: "leaves", solid: true });
    }
  }
}

/**
 * Plains-style oak-ish tree: variable trunk height, optional single branch, layered spherical canopy.
 * Leaves are generated from stacked disks so every leaf has a path of face-adjacent blocks to the trunk.
 */
function addTree(blocks: WorldBlock[], x: number, z: number) {
  if (!isBlockXZInWorldBounds(x, z)) return;

  const seed = treeSeed2d(x, z);
  const trunkHeight = 4 + (seed % 3);
  const fancyOak = (seed >>> 8) % 4 === 0;
  const layerCount = 4 + (fancyOak ? 2 : 0);

  addColumn(blocks, x, z, trunkHeight, 0.5, "wood");
  const trunkTopY = 0.5 + (trunkHeight - 1);

  if ((seed >>> 4) % 3 === 0) {
    const dir = (seed >>> 6) % 4;
    const bx = x + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
    const bz = z + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
    if (isBlockXZInWorldBounds(bx, bz)) {
      blocks.push({ position: [bx, trunkTopY, bz], material: "wood", solid: true });
    }
  }

  // Leaves start at the top log (ring only on that layer) so the crown sits lower.
  for (let layer = 0; layer < layerCount; layer += 1) {
    const y = trunkTopY + layer;
    const r = canopyLayerRadius(layer, layerCount);
    addTreeCanopyDisk(blocks, x, z, y, r, layer === 0);
  }

  const topLeafY = trunkTopY + (layerCount - 1);
  const logBelowTopLeaf = 1 + ((seed >>> 10) % 2);
  for (let k = 1; k <= logBelowTopLeaf; k += 1) {
    const wy = topLeafY - k;
    if (wy < 0.5) continue;
    blocks.push({ position: [x, wy, z], material: "wood", solid: true });
  }
}

function addCloud(blocks: WorldBlock[], x: number, z: number) {
  const cloudOffsets = [
    [0, 7.5, 0],
    [1, 7.5, 0],
    [2, 7.5, 0],
    [1, 8.5, 0],
    [3, 7.5, 1],
    [4, 7.5, 1],
  ] as const;

  cloudOffsets.forEach(([offsetX, y, offsetZ]) => {
    blocks.push({ position: [x + offsetX, y, z + offsetZ], material: "cloud" });
  });
}

/** 6×6 cobble well footprint; inner 2×2 is water (no terrain column). */
const wellMinX = -10;
const wellMaxX = -5;
const wellMinZ = -7;
const wellMaxZ = -2;

const wellWaterMinX = -8;
const wellWaterMaxX = -7;
const wellWaterMinZ = -5;
const wellWaterMaxZ = -4;

/** Inner 4×4 (cobble ring + roof) in XZ: x ∈ [-9,-6], z ∈ [-6,-3]. */
const wellRingMinX = -9;
const wellRingMaxX = -6;
const wellRingMinZ = -6;
const wellRingMaxZ = -3;

const waterPoolCellKeys = new Set<string>();
for (let x = wellWaterMinX; x <= wellWaterMaxX; x += 1) {
  for (let z = wellWaterMinZ; z <= wellWaterMaxZ; z += 1) {
    waterPoolCellKeys.add(`${x}:${z}`);
  }
}

function isWellWaterCell(x: number, z: number) {
  return x >= wellWaterMinX && x <= wellWaterMaxX && z >= wellWaterMinZ && z <= wellWaterMaxZ;
}

/** Cobble rim at water level: 6×6 minus inner 2×2 water (world y = 0.5 after export). */
function addWellBaseCobble(blocks: WorldBlock[]) {
  for (let x = wellMinX; x <= wellMaxX; x += 1) {
    for (let z = wellMinZ; z <= wellMaxZ; z += 1) {
      if (isWellWaterCell(x, z)) continue;
      blocks.push({ position: [x, -0.5, z], material: "cobblestone", solid: true });
    }
  }
}

/** One block above surface: 4×4 ring around 2×2 opening (world y = 1.5). */
function addWellMidRing(blocks: WorldBlock[]) {
  for (let x = wellRingMinX; x <= wellRingMaxX; x += 1) {
    for (let z = wellRingMinZ; z <= wellRingMaxZ; z += 1) {
      if (isWellWaterCell(x, z)) continue;
      blocks.push({ position: [x, 0.5, z], material: "cobblestone", solid: true });
    }
  }
}

/** Solid 4×4 roof above 3-high corner posts (world y = 5.5). */
function addWellRoof(blocks: WorldBlock[]) {
  for (let x = wellRingMinX; x <= wellRingMaxX; x += 1) {
    for (let z = wellRingMinZ; z <= wellRingMaxZ; z += 1) {
      blocks.push({ position: [x, 4.5, z], material: "cobblestone", solid: true });
    }
  }
}

/** Corner cells for 3-block-tall wooden fence posts (matches inner 4×4 cobble ring). */
export const wellFenceCornerCells: readonly [number, number][] = [
  [wellRingMinX, wellRingMinZ],
  [wellRingMaxX, wellRingMinZ],
  [wellRingMinX, wellRingMaxZ],
  [wellRingMaxX, wellRingMaxZ],
];

/**
 * 5×4 village home (90° from original 4×5 spec): deeper toward -Z near farm; door on min-X (west) face;
 * stair one block outside west at (4,-9); windows on length-5 minZ/maxZ edges.
 */
export const homeMinX = 5;
export const homeMaxX = 9;
export const homeMinZ = -10;
export const homeMaxZ = -7;

/** Middle of length-4 edge along Z (door column). */
export const homeDoorX = homeMinX;
export const homeDoorZ = homeMinZ + 1;
export const homeStairX = homeMinX - 1;
export const homeStairZ = homeDoorZ;

const homeFloorY = 0.5;
const homeBaseY = -0.5;
const homeWallY1 = 1.5;
const homeWallY2 = 2.5;
const homeWallY3 = 3.5;
const homeRoofY = 4.5;
const homeRidgeY = 5.5;
/** Middle of length-5 sides (minZ / maxZ edges); window 2 blocks above floor center (internal 2.5). */
const homeWindowX = homeMinX + 2;
const homeWindowY = homeWallY2;

function isHomeFootprint(x: number, z: number) {
  return x >= homeMinX && x <= homeMaxX && z >= homeMinZ && z <= homeMaxZ;
}

function isHomeCorner(x: number, z: number) {
  return (
    isHomeFootprint(x, z) &&
    (x === homeMinX || x === homeMaxX) &&
    (z === homeMinZ || z === homeMaxZ)
  );
}

function isHomePerimeter(x: number, z: number) {
  if (!isHomeFootprint(x, z)) return false;
  return x === homeMinX || x === homeMaxX || z === homeMinZ || z === homeMaxZ;
}

function isHomeDoorCell(x: number, z: number) {
  return x === homeDoorX && z === homeDoorZ;
}

function addVillageHomeAboveFloor(blocks: WorldBlock[]) {
  const wallYs = [homeWallY1, homeWallY2, homeWallY3] as const;
  for (const y of wallYs) {
    for (let x = homeMinX; x <= homeMaxX; x += 1) {
      for (let z = homeMinZ; z <= homeMaxZ; z += 1) {
        if (!isHomePerimeter(x, z)) continue;
        if (isHomeCorner(x, z)) {
          blocks.push({ position: [x, y, z], material: "wood", solid: true });
          continue;
        }
        if (isHomeDoorCell(x, z)) continue;
        if ((z === homeMinZ || z === homeMaxZ) && x === homeWindowX && y === homeWindowY) {
          blocks.push({ position: [x, y, z], material: "glass", solid: true });
          continue;
        }
        blocks.push({ position: [x, y, z], material: "woodPlanks", solid: true });
      }
    }
  }

  for (let x = homeMinX; x <= homeMaxX; x += 1) {
    for (let z = homeMinZ; z <= homeMaxZ; z += 1) {
      if (isHomeCorner(x, z)) continue;
      blocks.push({ position: [x, homeRoofY, z], material: "wood", solid: true });
    }
  }

  for (const x of [homeMinX + 1, homeMinX + 2, homeMinX + 3] as const) {
    for (const z of [homeMinZ + 1, homeMinZ + 2] as const) {
      blocks.push({ position: [x, homeRidgeY, z], material: "wood", solid: true });
    }
  }
}

/** 7×9 village farm: 7 along X, 9 along Z; raised one block (dirt base + surface). Log perimeter; mid-X water 7 long (interior Z only). */
const farmMinX = 8;
const farmMaxX = 14;
const farmMinZ = -5;
const farmMaxZ = 3;

const farmWaterX = farmMinX + 3;
/** Internal Y: dirt support under entire footprint; wood/farmland surface one block above. */
const farmBaseY = -0.5;
const farmSurfaceY = 0.5;
/** Exported world Y for water surface and crop block keys (matches farmSurfaceY + verticalOffset). */
const farmExportedSurfaceY = farmSurfaceY + 1;

function isFarmFootprint(x: number, z: number) {
  return x >= farmMinX && x <= farmMaxX && z >= farmMinZ && z <= farmMaxZ;
}

function isFarmWaterCell(x: number, z: number) {
  return x === farmWaterX && z > farmMinZ && z < farmMaxZ;
}

function isFarmPerimeterLog(x: number, z: number) {
  if (!isFarmFootprint(x, z) || isFarmWaterCell(x, z)) return false;
  return x === farmMinX || x === farmMaxX || z === farmMinZ || z === farmMaxZ;
}

function isFarmFarmlandCell(x: number, z: number) {
  return isFarmFootprint(x, z) && !isFarmWaterCell(x, z) && !isFarmPerimeterLog(x, z);
}

const farmWaterCellKeys = new Set<string>();
for (let z = farmMinZ + 1; z <= farmMaxZ - 1; z += 1) {
  farmWaterCellKeys.add(`${farmWaterX}:${z}`);
}

function addPerimeterWalls(blocks: WorldBlock[]) {
  for (let x = worldBounds.minX; x <= worldBounds.maxX; x += 1) {
    blocks.push({ position: [x, 0.5, worldBounds.minZ], material: "stoneDark", solid: true });

    if (x < -2 || x > 2) {
      blocks.push({ position: [x, 0.5, worldBounds.maxZ], material: "stoneDark", solid: true });
    }
  }

  for (let z = worldBounds.minZ; z <= worldBounds.maxZ; z += 1) {
    blocks.push({ position: [worldBounds.minX, 0.5, z], material: "stoneDark", solid: true });
    blocks.push({ position: [worldBounds.maxX, 0.5, z], material: "stoneDark", solid: true });
  }
}

function addSpawnBillboard(blocks: WorldBlock[]) {
  // A framed rear wall behind the spawn that can later host text/items.
  // addRect(blocks, -4, 4, 7, 7, 0.5, "spawnBoard", true);

  // addColumn(blocks, -4, 7, 5, 1.5, "stoneDark");
  // addColumn(blocks, 4, 7, 5, 1.5, "stoneDark");

  // addRect(blocks, -3, 3, 7, 7, 5.5, "stoneDark", true);
  addRect(blocks, -5, 5, 7, 7, 0.5, "spawnBoard", true);
  addRect(blocks, -5, 5, 7, 7, 1.5, "spawnBoard", true);
  addRect(blocks, -5, 5, 7, 7, 2.5, "spawnBoard", true);
  addRect(blocks, -5, 5, 7, 7, 3.5, "spawnBoard", true);
  addRect(blocks, -5, 5, 7, 7, 4.5, "spawnBoard", true);
  addRect(blocks, -5, 5, 7, 7, 5.5, "spawnBoard", true);


  blocks.push({ position: [0, 0.5, 2], material: "stoneDark", solid: true });
  // blocks.push({ position: [3, 4.5, 7], material: "stoneDark", solid: true });
}

function buildWorldBlocks() {
  const blocks: WorldBlock[] = [];
  const verticalOffset = 1;

  addRect(blocks, worldBounds.minX, worldBounds.maxX, worldBounds.minZ, worldBounds.maxZ, -1.5, "bedrock", true);

  for (let x = worldBounds.minX; x <= worldBounds.maxX; x += 1) {
    for (let z = worldBounds.minZ; z <= worldBounds.maxZ; z += 1) {
      if (waterPoolCellKeys.has(`${x}:${z}`)) continue;
      if (isHomeFootprint(x, z)) {
        blocks.push({ position: [x, homeBaseY, z], material: "dirt", solid: true });
        blocks.push({ position: [x, homeFloorY, z], material: "cobblestone", solid: true });
        continue;
      }
      if (isFarmFootprint(x, z)) {
        blocks.push({ position: [x, farmBaseY, z], material: "dirt", solid: true });
        if (farmWaterCellKeys.has(`${x}:${z}`)) continue;
        if (isFarmPerimeterLog(x, z)) {
          blocks.push({ position: [x, farmSurfaceY, z], material: "wood", solid: true });
          continue;
        }
        if (isFarmFarmlandCell(x, z)) {
          blocks.push({ position: [x, farmSurfaceY, z], material: "farmland", solid: true });
          continue;
        }
        continue;
      }
      addTerrainColumn(blocks, x, z);
    }
  }

  // Former village footprint: natural grass from `addTerrainColumn` (no paths or structures).

  // Trees near map edges; inset so canopies stay inside bounds.
  addTree(blocks, -15, -11);
  addTree(blocks, 15, -11);
  addTree(blocks, -15, -22);
  addTree(blocks, 15, -22);
  addTree(blocks, -12, -25);
  addTree(blocks, 12, -25);

  // addCloud(blocks, -12, -6);
  // addCloud(blocks, 5, -17);
  // addCloud(blocks, 10, -8);

  addPerimeterWalls(blocks);
  addSpawnBillboard(blocks);

  addWellBaseCobble(blocks);
  addWellMidRing(blocks);
  addWellRoof(blocks);

  addVillageHomeAboveFloor(blocks);

  const dedupedBlocks = new Map<string, WorldBlock>();

  blocks.forEach((block) => {
    dedupedBlocks.set(`${block.position[0]}:${block.position[1]}:${block.position[2]}`, block);
  });

  for (const block of dedupedBlocks.values()) {
    if (block.material !== "grass" && block.material !== "grassShade") continue;

    const blockAbove = dedupedBlocks.get(`${block.position[0]}:${block.position[1] + 1}:${block.position[2]}`);
    if (!blockAbove) continue;

    block.material = "dirt";
  }

  return Array.from(dedupedBlocks.values()).map((block) => ({
    ...block,
    position: [block.position[0], block.position[1] + verticalOffset, block.position[2]] as [number, number, number],
    solid: block.solid || block.position[1] === -0.5,
  }));
}

function cellKey(x: number, z: number) {
  return `${Math.round(x)}:${Math.round(z)}`;
}

export const worldBlocks = buildWorldBlocks();

export const obstacleCells = new Set(
  worldBlocks.filter((block) => block.solid).map((block) => cellKey(block.position[0], block.position[2])),
);

/** Block keys of farmland cells that start with carrots planted (exported world y matches farm surface). */
export const worldAuthoredCrops = new Set<string>(
  (() => {
    const keys: string[] = [];
    for (let x = farmMinX; x <= farmMaxX; x += 1) {
      for (let z = farmMinZ; z <= farmMaxZ; z += 1) {
        if (isFarmFarmlandCell(x, z)) keys.push(`${x}:${farmExportedSurfaceY}:${z}`);
      }
    }
    return keys;
  })(),
);

export const worldWaterSources: WaterSource[] = (() => {
  const sources: WaterSource[] = [];
  for (let x = wellWaterMinX; x <= wellWaterMaxX; x += 1) {
    for (let z = wellWaterMinZ; z <= wellWaterMaxZ; z += 1) {
      sources.push({ position: [x, 0.5, z] });
    }
  }
  for (let z = farmMinZ + 1; z <= farmMaxZ - 1; z += 1) {
    sources.push({ position: [farmWaterX, farmExportedSurfaceY, z] });
  }
  return sources;
})();
