import type { InteractionId } from "@/data/interactions";

export type WorldMaterial =
  | "grass"
  | "grassShade"
  | "path"
  | "stone"
  | "stoneDark"
  | "wood"
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

export const landmarks: Landmark[] = [
  { id: "about", position: [0, 0.75, -5], label: "Open Spawn Cabin", subtitle: "About", accent: "aboutAccent" },
  { id: "resume", position: [0, 0.75, -11], label: "Open Resume Keep", subtitle: "Resume", accent: "resumeAccent" },
  {
    id: "projects",
    position: [8, 0.75, -12],
    label: "Enter Projects Forge",
    subtitle: "Projects",
    accent: "projectsAccent",
  },
  {
    id: "research",
    position: [-8, 0.75, -14],
    label: "Enter Research Lab",
    subtitle: "Research",
    accent: "researchAccent",
  },
  {
    id: "contact",
    position: [0, 0.75, -20],
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

const flatTerrainZones: TerrainZone[] = [
  { minX: -5, maxX: 5, minZ: -8, maxZ: 8 },
  { minX: -2, maxX: 2, minZ: -23, maxZ: 7 },
  { minX: 0, maxX: 10, minZ: -14, maxZ: -10 },
  { minX: -10, maxX: 0, minZ: -16, maxZ: -12 },
  { minX: -4, maxX: 4, minZ: -23, maxZ: -17 },
];

function isInsideZone(x: number, z: number, zone: TerrainZone) {
  return x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;
}

function shouldKeepTerrainFlat(x: number, z: number) {
  if (flatTerrainZones.some((zone) => isInsideZone(x, z, zone))) {
    return true;
  }

  return landmarks.some((landmark) => Math.abs(landmark.position[0] - x) <= 2 && Math.abs(landmark.position[2] - z) <= 2);
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

function addShrinePad(
  blocks: WorldBlock[],
  x: number,
  z: number,
  accent: Extract<WorldMaterial, `${string}Accent`>,
) {
  addRect(blocks, x - 1, x + 1, z - 1, z + 1, -0.5, "stone");
  addColumn(blocks, x - 1, z - 1, 2, 0.5, "stoneDark");
  addColumn(blocks, x + 1, z - 1, 2, 0.5, "stoneDark");
  addColumn(blocks, x - 1, z + 1, 2, 0.5, "stoneDark");
  addColumn(blocks, x + 1, z + 1, 2, 0.5, "stoneDark");
  addColumn(blocks, x, z - 1, 1, 0.5, accent);
  addColumn(blocks, x, z + 1, 1, 0.5, accent);
}

function addTree(blocks: WorldBlock[], x: number, z: number) {
  addColumn(blocks, x, z, 3, 0.5, "wood");

  const leafOffsets = [
    [-1, 2.5, 0],
    [1, 2.5, 0],
    [0, 2.5, -1],
    [0, 2.5, 1],
    [0, 3.5, 0],
    [-1, 3.5, -1],
    [1, 3.5, -1],
    [-1, 3.5, 1],
    [1, 3.5, 1],
  ] as const;

  leafOffsets.forEach(([offsetX, y, offsetZ]) => {
    blocks.push({ position: [x + offsetX, y, z + offsetZ], material: "leaves", solid: true });
  });
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

function buildWorldBlocks() {
  const blocks: WorldBlock[] = [];

  for (let x = worldBounds.minX; x <= worldBounds.maxX; x += 1) {
    for (let z = worldBounds.minZ; z <= worldBounds.maxZ; z += 1) {
      addTerrainColumn(blocks, x, z);
    }
  }

  addRect(blocks, -3, 3, -7, -1, -0.5, "stone");
  addRect(blocks, -1, 1, -22, 6, -0.5, "path");
  addRect(blocks, 1, 9, -13, -11, -0.5, "path");
  addRect(blocks, -9, -1, -15, -13, -0.5, "path");
  addRect(blocks, -3, 3, -22, -18, -0.5, "stone");

  addShrinePad(blocks, 0, -5, "aboutAccent");
  addShrinePad(blocks, 0, -11, "resumeAccent");
  addShrinePad(blocks, 8, -12, "projectsAccent");
  addShrinePad(blocks, -8, -14, "researchAccent");
  addShrinePad(blocks, 0, -20, "contactAccent");

  addColumn(blocks, -1, -20, 3, 0.5, "contactAccent");
  addColumn(blocks, 1, -20, 3, 0.5, "contactAccent");
  blocks.push({ position: [0, 2.5, -20], material: "contactAccent", solid: true });

  addTree(blocks, -13, -9);
  addTree(blocks, 13, -9);
  addTree(blocks, -14, -20);
  addTree(blocks, 14, -20);
  addTree(blocks, -10, -24);
  addTree(blocks, 10, -24);

  addCloud(blocks, -12, -6);
  addCloud(blocks, 5, -17);
  addCloud(blocks, 10, -8);

  addPerimeterWalls(blocks);

  const dedupedBlocks = new Map<string, WorldBlock>();

  blocks.forEach((block) => {
    dedupedBlocks.set(`${block.position[0]}:${block.position[1]}:${block.position[2]}`, block);
  });

  return Array.from(dedupedBlocks.values());
}

function cellKey(x: number, z: number) {
  return `${Math.round(x)}:${Math.round(z)}`;
}

export const worldBlocks = buildWorldBlocks();

export const obstacleCells = new Set(
  [
    ...worldBlocks.filter((block) => block.solid).map((block) => cellKey(block.position[0], block.position[2])),
    ...landmarks.map((landmark) => cellKey(landmark.position[0], landmark.position[2])),
  ].filter(Boolean),
);
