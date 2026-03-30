import type { InteractionId } from "@/data/interactions";

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
    texture: "/textures/sky/minecraft-sun.svg",
    scale: [12, 12, 1] as [number, number, number],
    orbitRadius: 92,
    verticalRadius: 44,
  },
  moon: {
    texture: "/textures/sky/minecraft-moon.svg",
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

/** Flat ground for spawn pocket, main plains village, and connecting spine (billboard stays at z=7). */
const flatTerrainZones: TerrainZone[] = [
  { minX: -6, maxX: 6, minZ: -9, maxZ: 8 },
  { minX: -13, maxX: 13, minZ: -25, maxZ: -7 },
  { minX: -4, maxX: 4, minZ: -25, maxZ: 6 },
];

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

type DoorEdge = "north" | "south" | "east" | "west";

/** Simple oak-and-cobble style house with a flat plank roof; door is a 1-block gap on the chosen edge. */
function addVillageHouse(
  blocks: WorldBlock[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  doorEdge: DoorEdge,
) {
  addRect(blocks, minX, maxX, minZ, maxZ, 0.5, "stone", true);

  const doorX = Math.round((minX + maxX) / 2);
  const doorZ = Math.round((minZ + maxZ) / 2);

  for (const y of [1.5, 2.5]) {
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const onEdge = x === minX || x === maxX || z === minZ || z === maxZ;
        if (!onEdge) continue;
        if (doorEdge === "south" && z === minZ && x === doorX) continue;
        if (doorEdge === "north" && z === maxZ && x === doorX) continue;
        if (doorEdge === "west" && x === minX && z === doorZ) continue;
        if (doorEdge === "east" && x === maxX && z === doorZ) continue;
        blocks.push({ position: [x, y, z], material: "wood", solid: true });
      }
    }
  }

  addRect(blocks, minX, maxX, minZ, maxZ, 3.5, "wood", true);
}

/** Stone rim, shallow “water” center, and a small timber roof frame. */
function addVillageWell(blocks: WorldBlock[], cx: number, cz: number) {
  addRect(blocks, cx - 1, cx + 1, cz - 1, cz + 1, 0.5, "stoneDark", true);
  blocks.push({ position: [cx, 1.5, cz], material: "dirt", solid: true });
  addColumn(blocks, cx - 1, cz - 1, 2, 1.5, "wood");
  addColumn(blocks, cx + 1, cz - 1, 2, 1.5, "wood");
  addRect(blocks, cx - 1, cx + 1, cz - 1, cz - 1, 3.5, "wood", true);
}

/** Tilled-style plot with a path irrigation strip on −X and crop-like leaf stubs. */
function addVillageFarm(blocks: WorldBlock[], minX: number, maxX: number, minZ: number, maxZ: number) {
  addRect(blocks, minX, maxX, minZ, maxZ, 0.5, "dirt", true);
  for (let z = minZ; z <= maxZ; z += 1) {
    blocks.push({ position: [minX - 1, -0.5, z], material: "path" });
  }
  for (let x = minX; x <= maxX; x += 2) {
    for (let z = minZ; z <= maxZ; z += 2) {
      blocks.push({ position: [x, 1.5, z], material: "leaves", solid: true });
    }
  }
}

function addLampPost(blocks: WorldBlock[], x: number, z: number) {
  addColumn(blocks, x, z, 3, 0.5, "stoneDark");
  blocks.push({ position: [x, 3.5, z], material: "wood", solid: true });
}

function addHayBaleStack(blocks: WorldBlock[], x: number, z: number) {
  blocks.push({ position: [x, 0.5, z], material: "dirt", solid: true });
  blocks.push({ position: [x, 1.5, z], material: "dirt", solid: true });
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

  // —— Plains village: roads & plazas (landmark cells stay walkable) ——
  addRect(blocks, -4, 4, -5, 0, -0.5, "stone");
  addRect(blocks, -4, 4, -22, -4, -0.5, "path");
  addRect(blocks, -3, 3, -4, 1, -0.5, "path");
  addRect(blocks, -10, 10, -12, -10, -0.5, "path");
  addRect(blocks, -8, 8, -17, -15, -0.5, "path");
  addRect(blocks, 4, 12, -14, -10, -0.5, "path");
  addRect(blocks, -12, -4, -17, -12, -0.5, "path");
  addRect(blocks, -5, 5, -22, -18, -0.5, "stone");

  addVillageWell(blocks, -4, -10);

  addVillageHouse(blocks, -13, -10, -9, -6, "east");
  addVillageHouse(blocks, 10, 13, -9, -6, "west");
  // Corner cottages north of the field strips so farms don’t overlap house footprints.
  addVillageHouse(blocks, -10, -7, -19, -16, "south");
  addVillageHouse(blocks, 7, 10, -19, -16, "south");
  addVillageHouse(blocks, -12, -9, -16, -13, "south");
  // Keep x = 8 clear for the Projects landmark; house starts at x = 9.
  addVillageHouse(blocks, 9, 12, -16, -13, "south");

  addVillageFarm(blocks, -12, -8, -22, -20);
  addVillageFarm(blocks, 8, 12, -22, -20);

  addLampPost(blocks, 1, -11);
  addLampPost(blocks, -1, -11);
  addLampPost(blocks, 5, -12);
  addLampPost(blocks, -5, -12);
  addLampPost(blocks, 0, -16);
  addLampPost(blocks, 0, -20);

  addHayBaleStack(blocks, 3, -8);
  addHayBaleStack(blocks, -3, -8);

  // Trees pushed toward world edges so they don’t clip roofs or roads.
  addTree(blocks, -17, -11);
  addTree(blocks, 17, -11);
  addTree(blocks, -16, -22);
  addTree(blocks, 16, -22);
  addTree(blocks, -14, -25);
  addTree(blocks, 14, -25);

  // addCloud(blocks, -12, -6);
  // addCloud(blocks, 5, -17);
  // addCloud(blocks, 10, -8);

  addPerimeterWalls(blocks);
  addSpawnBillboard(blocks);

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
