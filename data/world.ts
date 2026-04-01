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
  | "cloud";

export type WorldBlock = {
  position: [number, number, number];
  material: WorldMaterial;
  solid?: boolean;
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

  // Showcase row in front of spawn (z=4); cubes use instanced voxels — door/stairs mount in GameScene.
  blocks.push({ position: [-1, 0.5, 4], material: "glass", solid: true });
  blocks.push({ position: [0, 0.5, 4], material: "woodPlanks", solid: true });
  blocks.push({ position: [2, 0.5, 4], material: "cobblestone", solid: true });

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
