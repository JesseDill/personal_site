"use client";

import { Hud, PerspectiveCamera, PointerLockControls, useTexture } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { interactionContent, type InteractionId } from "@/data/interactions";
import {
  landmarks,
  type WorldBlock,
  worldBlocks,
  worldBounds,
  worldSky,
  type WorldMaterial,
} from "@/data/world";

type MaterialDefinition = {
  textures: {
    all?: string;
    side?: string;
    top?: string;
    bottom?: string;
    right?: string;
    left?: string;
    front?: string;
    back?: string;
  };
  uiColor: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  alphaTest?: number;
};

const cubeFaceOrder = ["right", "left", "top", "bottom", "front", "back"] as const;
type CubeFace = (typeof cubeFaceOrder)[number];

const materialPalette = {
  grass: {
    textures: {
      top: "/textures/world/grass-top.svg",
      bottom: "/textures/world/dirt.svg",
      side: "/textures/world/grass-side.svg",
    },
    uiColor: "#7c9f50",
    roughness: 1,
  },
  grassShade: {
    textures: {
      top: "/textures/world/grass-shade-top.svg",
      bottom: "/textures/world/dirt.svg",
      side: "/textures/world/grass-shade-side.svg",
    },
    uiColor: "#6a8b45",
    roughness: 1,
  },
  dirt: { textures: { all: "/textures/world/dirt.svg" }, uiColor: "#8b6541", roughness: 1 },
  path: { textures: { all: "/textures/world/path.svg" }, uiColor: "#b89b6f", roughness: 0.96 },
  stone: { textures: { all: "/textures/world/stone.svg" }, uiColor: "#9f9380", roughness: 1 },
  stoneDark: { textures: { all: "/textures/world/stone-dark.svg" }, uiColor: "#5f5a54", roughness: 1 },
  wood: {
    textures: {
      top: "/textures/world/log-top.svg",
      bottom: "/textures/world/log-top.svg",
      side: "/textures/world/log-side.svg",
    },
    uiColor: "#8e6438",
    roughness: 0.95,
  },
  leaves: {
    textures: { all: "/textures/world/leaves.svg" },
    uiColor: "#4d7940",
    roughness: 1,
    transparent: true,
    alphaTest: 0.5,
  },
  aboutAccent: {
    textures: { all: "/textures/world/about-accent.svg" },
    uiColor: "#f0d476",
    roughness: 0.8,
    emissive: "#f0d476",
    emissiveIntensity: 0.1,
  },
  resumeAccent: {
    textures: { all: "/textures/world/resume-accent.svg" },
    uiColor: "#79d9ff",
    roughness: 0.7,
    emissive: "#79d9ff",
    emissiveIntensity: 0.12,
  },
  projectsAccent: {
    textures: { all: "/textures/world/projects-accent.svg" },
    uiColor: "#f6b44d",
    roughness: 0.75,
    emissive: "#f6b44d",
    emissiveIntensity: 0.1,
  },
  researchAccent: {
    textures: { all: "/textures/world/research-accent.svg" },
    uiColor: "#9bd77a",
    roughness: 0.8,
    emissive: "#9bd77a",
    emissiveIntensity: 0.09,
  },
  contactAccent: {
    textures: { all: "/textures/world/contact-accent.svg" },
    uiColor: "#7de4d0",
    roughness: 0.75,
    emissive: "#7de4d0",
    emissiveIntensity: 0.14,
  },
  cloud: { textures: { all: "/textures/world/cloud.svg" }, uiColor: "#f8fafc", roughness: 1, metalness: 0.02 },
} satisfies Record<WorldMaterial, MaterialDefinition>;

function resolveFaceTextures(material: MaterialDefinition): Record<CubeFace, string> {
  const { all, side, top, bottom, right, left, front, back } = material.textures;
  const fallback = all ?? side ?? top ?? bottom;

  if (!fallback) {
    throw new Error("Every material needs at least one texture.");
  }

  return {
    right: right ?? side ?? all ?? fallback,
    left: left ?? side ?? all ?? fallback,
    top: top ?? all ?? side ?? fallback,
    bottom: bottom ?? all ?? side ?? fallback,
    front: front ?? side ?? all ?? fallback,
    back: back ?? side ?? all ?? fallback,
  };
}

const faceTexturePaths = Object.fromEntries(
  (Object.entries(materialPalette) as [WorldMaterial, MaterialDefinition][]).map(([key, material]) => [
    key,
    resolveFaceTextures(material),
  ]),
) as Record<WorldMaterial, Record<CubeFace, string>>;

const uniqueTexturePaths = Array.from(
  new Set(
    Object.values(faceTexturePaths).flatMap((facePaths) => cubeFaceOrder.map((face) => facePaths[face])),
  ),
);

const uniqueSkyTexturePaths = Array.from(
  new Set([worldSky.sun.texture, worldSky.moon.texture]),
);

const armTextureDefinitions = {
  skin: {
    // side: "/textures/player/arm-skin-side.svg",
    side: "/textures/player/minecraft_arm_one_side.jpg",
    top: "/textures/player/minecraft_arm_top.png",
    bottom: "/textures/player/arm-skin-bottom.svg",
  },
  sleeve: {
    side: "/textures/player/arm-sleeve-side.svg",
    top: "/textures/player/arm-sleeve-top.svg",
    bottom: "/textures/player/arm-sleeve-bottom.svg",
  },
  cuff: {
    side: "/textures/player/arm-cuff-side.svg",
    top: "/textures/player/arm-cuff-top.svg",
    bottom: "/textures/player/arm-cuff-bottom.svg",
  },
} as const;

const armRenderFlags = {
  sleeve: false,
  cuff: false,
} as const;

const armFaceTexturePaths = Object.fromEntries(
  Object.entries(armTextureDefinitions).map(([key, textures]) => [
    key,
    resolveFaceTextures({ textures, uiColor: "#ffffff" }),
  ]),
) as Record<keyof typeof armTextureDefinitions, Record<CubeFace, string>>;

const uniqueArmTexturePaths = Array.from(
  new Set(
    Object.values(armFaceTexturePaths).flatMap((facePaths) => cubeFaceOrder.map((face) => facePaths[face])),
  ),
);

const terrainImpactMaterials = (Object.keys(materialPalette) as WorldMaterial[]).filter(
  (material): material is Exclude<WorldMaterial, "cloud"> => material !== "cloud",
);

const terrainImpactConfig = {
  maxDistance: 4,
  particlesPerBurst: 12,
  maxParticlesPerMaterial: 64,
  fragmentSize: 0.05,
  gravity: 6.4,
  burstVelocity: 1.05,
  randomVelocity: 0.75,
  angularVelocity: 8,
} as const;

const blockBreakTexturePaths = [
  "/textures/world/block-break-stage-1.svg",
  "/textures/world/block-break-stage-2.svg",
  "/textures/world/block-break-stage-3.svg",
  "/textures/world/block-break-stage-4.svg",
  "/textures/world/block-break-stage-5.svg",
] as const;

const blockBreakHitsRequired = {
  grass: 4,
  grassShade: 4,
  dirt: 4,
  path: 5,
  stone: 8,
  stoneDark: 9,
  wood: 6,
  leaves: 2,
  aboutAccent: 10,
  resumeAccent: 10,
  projectsAccent: 10,
  researchAccent: 10,
  contactAccent: 10,
} satisfies Record<Exclude<WorldMaterial, "cloud">, number>;

const playerCollisionConfig = {
  radius: 0.34,
  height: 1.8,
  eyeHeight: 1.6,
  boundaryPadding: 0.5,
  stepHeight: 0.65,
  groundSnapDistance: 0.18,
} as const;

const blockedInteractionCells = new Set(landmarks.map((landmark) => `${Math.round(landmark.position[0])}:${Math.round(landmark.position[2])}`));

let activeRemovedTerrainBlockKeys = new Set<string>();
let activePlacedTerrainBlocks = new Map<string, WorldBlock>();
let activePlacedSolidColumns = new Map<string, SolidSegment[]>();

type SolidSegment = {
  bottom: number;
  top: number;
  cellX: number;
  cellZ: number;
  blockKey: string;
};

function getBlockKey(position: [number, number, number]) {
  return `${position[0]}:${position[1]}:${position[2]}`;
}

function buildSolidColumns(blocks: WorldBlock[]) {
  return blocks.reduce((columns, block) => {
    if (!block.solid) return columns;

    const blockKey = getBlockKey(block.position);
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
  }, new Map<string, SolidSegment[]>());
}

const worldTerrainBlockKeys = new Set(worldBlocks.map((block) => getBlockKey(block.position)));

const solidColumns = buildSolidColumns(worldBlocks);

function getSolidColumn(cellX: number, cellZ: number) {
  const key = `${cellX}:${cellZ}`;
  return [...(solidColumns.get(key) ?? []), ...(activePlacedSolidColumns.get(key) ?? [])];
}

function isRemovedTerrainBlockKey(blockKey: string) {
  return activeRemovedTerrainBlockKeys.has(blockKey) && !activePlacedTerrainBlocks.has(blockKey);
}

function isOccupiedTerrainBlockKey(blockKey: string) {
  return activePlacedTerrainBlocks.has(blockKey) || (worldTerrainBlockKeys.has(blockKey) && !activeRemovedTerrainBlockKeys.has(blockKey));
}

function getPlacementPositionFromHit(hit: CenterTerrainHit): [number, number, number] {
  const absX = Math.abs(hit.normal.x);
  const absY = Math.abs(hit.normal.y);
  const absZ = Math.abs(hit.normal.z);

  if (absX >= absY && absX >= absZ) {
    return [hit.blockPosition[0] + Math.sign(hit.normal.x || 1), hit.blockPosition[1], hit.blockPosition[2]];
  }

  if (absY >= absX && absY >= absZ) {
    return [hit.blockPosition[0], hit.blockPosition[1] + Math.sign(hit.normal.y || 1), hit.blockPosition[2]];
  }

  return [hit.blockPosition[0], hit.blockPosition[1], hit.blockPosition[2] + Math.sign(hit.normal.z || 1)];
}

function blockIntersectsPlayer(position: [number, number, number], cameraPosition: THREE.Vector3) {
  const playerFeetY = cameraPosition.y - playerCollisionConfig.eyeHeight;
  const bodyBottom = playerFeetY + 0.001;
  const bodyTop = playerFeetY + playerCollisionConfig.height - 0.001;
  const blockBottom = position[1] - 0.5;
  const blockTop = position[1] + 0.5;

  return (
    overlapsCellFootprint(cameraPosition.x, cameraPosition.z, Math.round(position[0]), Math.round(position[2])) &&
    blockTop > bodyBottom &&
    blockBottom < bodyTop
  );
}

function getOccupiedCellRange(center: number, radius: number) {
  return {
    min: Math.ceil(center - radius - 0.5),
    max: Math.floor(center + radius + 0.5),
  };
}

function overlapsCellFootprint(x: number, z: number, cellX: number, cellZ: number) {
  return (
    x + playerCollisionConfig.radius > cellX - 0.5 &&
    x - playerCollisionConfig.radius < cellX + 0.5 &&
    z + playerCollisionConfig.radius > cellZ - 0.5 &&
    z - playerCollisionConfig.radius < cellZ + 0.5
  );
}

function getHighestSupportBelow(x: number, feetY: number, z: number) {
  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let highestSupport = Number.NEGATIVE_INFINITY;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getSolidColumn(cellX, cellZ);
      if (!column) continue;

      column.forEach((segment) => {
        if (activeRemovedTerrainBlockKeys.has(segment.blockKey)) return;
        if (segment.top <= feetY + 0.001) {
          highestSupport = Math.max(highestSupport, segment.top);
        }
      });
    }
  }

  return highestSupport === Number.NEGATIVE_INFINITY ? 0 : highestSupport;
}

function canPlayerOccupyPosition(x: number, feetY: number, z: number) {
  const inset = playerCollisionConfig.boundaryPadding + playerCollisionConfig.radius;
  const insideBounds =
    x > worldBounds.minX + inset &&
    x < worldBounds.maxX - inset &&
    z > worldBounds.minZ + inset &&
    z < worldBounds.maxZ - inset;

  if (!insideBounds) {
    return false;
  }

  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  const bodyBottom = feetY + 0.001;
  const bodyTop = feetY + playerCollisionConfig.height - 0.001;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsCellFootprint(x, z, cellX, cellZ)) continue;

      if (blockedInteractionCells.has(`${cellX}:${cellZ}`)) {
        return false;
      }

      const column = getSolidColumn(cellX, cellZ);
      if (!column) continue;

      if (column.some((segment) => !activeRemovedTerrainBlockKeys.has(segment.blockKey) && segment.top > bodyBottom && segment.bottom < bodyTop)) {
        return false;
      }
    }
  }

  return true;
}

function findStepUpHeight(x: number, currentFeetY: number, z: number) {
  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let bestStepHeight: number | null = null;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getSolidColumn(cellX, cellZ);
      if (!column) continue;

      column.forEach((segment) => {
        if (activeRemovedTerrainBlockKeys.has(segment.blockKey)) return;
        const stepHeight = segment.top - currentFeetY;
        if (stepHeight <= 0.001 || stepHeight > playerCollisionConfig.stepHeight) {
          return;
        }

        if (canPlayerOccupyPosition(x, segment.top, z)) {
          bestStepHeight = bestStepHeight === null ? segment.top : Math.max(bestStepHeight, segment.top);
        }
      });
    }
  }

  return bestStepHeight;
}

function resolveUpwardFeetPosition(x: number, currentFeetY: number, targetFeetY: number, z: number) {
  if (canPlayerOccupyPosition(x, targetFeetY, z)) {
    return targetFeetY;
  }

  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let lowestCeiling = Number.POSITIVE_INFINITY;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getSolidColumn(cellX, cellZ);
      if (!column) continue;

      column.forEach((segment) => {
        if (activeRemovedTerrainBlockKeys.has(segment.blockKey)) return;
        if (
          segment.bottom >= currentFeetY + playerCollisionConfig.height - 0.001 &&
          segment.bottom < targetFeetY + playerCollisionConfig.height
        ) {
          lowestCeiling = Math.min(lowestCeiling, segment.bottom);
        }
      });
    }
  }

  if (lowestCeiling !== Number.POSITIVE_INFINITY) {
    return Math.max(currentFeetY, lowestCeiling - playerCollisionConfig.height);
  }

  return currentFeetY;
}

function configurePixelTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

type CenterTerrainHit = {
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  blockPosition: [number, number, number];
  blockKey: string;
};

type BreakableTerrainHit = Pick<CenterTerrainHit, "blockKey" | "blockPosition" | "terrainMaterial">;

type DroppedBlockItem = {
  id: string;
  material: "dirt" | "wood";
  blockPosition: [number, number, number];
  spawnedAt: number;
  phase: number;
  drift: [number, number];
};

const collectedInventoryConfig = {
  dirt: {
    label: "Dirt",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.dirt[face]),
  },
  wood: {
    label: "Log",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.wood[face]),
  },
} satisfies Record<DroppedBlockItem["material"], { label: string; faceTextures: string[] }>;

const collectedInventoryMaterials = Object.keys(collectedInventoryConfig) as DroppedBlockItem["material"][];
const hotbarSlotCount = 9;
const hotbarPreviewTexturePaths = Array.from(
  new Set(collectedInventoryMaterials.flatMap((material) => collectedInventoryConfig[material].faceTextures)),
);

function useHotbarPreviewTextures() {
  const textures = useTexture(hotbarPreviewTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  const texturesByPath = useMemo(
    () =>
      Object.fromEntries(hotbarPreviewTexturePaths.map((path, index) => [path, textures[index]])) as Record<string, THREE.Texture>,
    [textures],
  );

  return useMemo(
    () =>
      Object.fromEntries(
        collectedInventoryMaterials.map((material) => [
          material,
          collectedInventoryConfig[material].faceTextures.map((path) => texturesByPath[path]),
        ]),
      ) as Record<DroppedBlockItem["material"], THREE.Texture[]>,
    [texturesByPath],
  );
}

function InventoryVoxelIcon({ material }: { material: DroppedBlockItem["material"] }) {
  const config = collectedInventoryConfig[material];

  return (
    <span className="collected-slot-voxel" role="img" aria-label={config.label}>
      <Canvas
        className="collected-slot-voxel-canvas"
        orthographic
        frameloop="demand"
        camera={{ position: [2.6, 2.3, 2.6], zoom: 24 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false }}
      >
        <InventoryVoxelPreviewScene texturePaths={config.faceTextures} />
      </Canvas>
    </span>
  );
}

function InventoryVoxelPreviewScene({ texturePaths }: { texturePaths: string[] }) {
  const textures = useTexture(texturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      {/* Hotbar voxel preview cheat sheet:
          camera.position[0] / x: orbit view left-right around the block
          camera.position[1] / y: raise or lower the viewing angle to show more or less of the top face
          camera.position[2] / z: push the camera around the diagonal; usually change with x for a balanced view
          camera.zoom: make the block appear larger or smaller inside the slot
          rotation[0] / x: tilt the block to expose more or less of the top face
          rotation[1] / y: turn the block to favor the left or right side
          rotation[2] / z: roll the block for a stylized slant, usually keep near 0 */}
      <mesh rotation={[0.0, 0.0, 0]} scale={0.9}>
        <boxGeometry args={[1, 1, 1]} />
        {textures.map((texture, index) => (
          <meshStandardMaterial
            key={`inventory-voxel-${index}-${texture.uuid}`}
            attach={`material-${index}`}
            map={texture}
            color="#ffffff"
            roughness={1}
            metalness={0}
            toneMapped={false}
          />
        ))}
      </mesh>
    </>
  );
}

function getCenterTerrainHit(raycaster: THREE.Raycaster, camera: THREE.Camera, scene: THREE.Scene, maxDistance: number) {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster
    .intersectObjects(scene.children, true)
    .find(
      (entry) =>
        (entry.object.userData?.terrainMaterial as WorldMaterial | undefined) &&
        entry.distance <= maxDistance,
    );

  if (!hit) return null;

  const terrainMaterial = hit.object.userData?.terrainMaterial as WorldMaterial | undefined;

  if (!terrainMaterial || terrainMaterial === "cloud") {
    return null;
  }

  const normal = (hit.face?.normal ?? new THREE.Vector3(0, 1, 0)).clone();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  normal.applyMatrix3(normalMatrix).normalize();

  const blockPosition = new THREE.Vector3();

  if (hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
    const instanceMatrix = new THREE.Matrix4();
    hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
    blockPosition.setFromMatrixPosition(instanceMatrix);
    hit.object.localToWorld(blockPosition);
  } else {
    blockPosition.copy(hit.object.getWorldPosition(new THREE.Vector3()));
  }

  const blockKey = `${blockPosition.x}:${blockPosition.y}:${blockPosition.z}`;

  if (isRemovedTerrainBlockKey(blockKey)) {
    return null;
  }

  return {
    terrainMaterial,
    point: hit.point.clone(),
    normal,
    blockPosition: [blockPosition.x, blockPosition.y, blockPosition.z] as [number, number, number],
    blockKey,
  } satisfies CenterTerrainHit;
}

function groupBlocksByMaterial(blocks: WorldBlock[]) {
  const grouped = {} as Record<WorldMaterial, [number, number, number][]>;

  (Object.keys(materialPalette) as WorldMaterial[]).forEach((material) => {
    grouped[material] = [];
  });

  blocks.forEach((block) => {
    grouped[block.material].push(block.position);
  });

  return grouped;
}

function useWorldTextures() {
  const textures = useTexture(uniqueTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  return useMemo(
    () =>
      Object.fromEntries(uniqueTexturePaths.map((path, index) => [path, textures[index]])) as Record<string, THREE.Texture>,
    [textures],
  );
}

function useArmTextures() {
  const textures = useTexture(uniqueArmTexturePaths) as THREE.Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  const texturesByPath = useMemo(
    () =>
      Object.fromEntries(uniqueArmTexturePaths.map((path, index) => [path, textures[index]])) as Record<string, THREE.Texture>,
    [textures],
  );

  return useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(armTextureDefinitions) as Array<keyof typeof armTextureDefinitions>).map((part) => [
          part,
          cubeFaceOrder.map((face) => texturesByPath[armFaceTexturePaths[part][face]]),
        ]),
      ) as Record<keyof typeof armTextureDefinitions, THREE.Texture[]>,
    [texturesByPath],
  );
}

function orbitSkyBody(
  progress: number,
  orbitRadius: number,
  verticalRadius: number,
  orbitAxis: "x" | "z",
  heightOffset: number,
  phaseOffset = 0,
) {
  const angle = progress * Math.PI * 2 + phaseOffset;
  const horizontal = Math.cos(angle) * orbitRadius;
  const x = orbitAxis === "x" ? horizontal : 0;
  const z = orbitAxis === "z" ? horizontal : 0;

  return {
    angle,
    position: new THREE.Vector3(x, Math.sin(angle) * verticalRadius + heightOffset, z),
  };
}

function applyLerpedColor(color: THREE.Color, from: string, to: string, alpha: number) {
  color.set(from).lerp(new THREE.Color(to), alpha);
}

function wrapIntoRange(value: number, min: number, max: number) {
  const range = max - min;
  if (range <= 0) return min;

  return ((((value - min) % range) + range) % range) + min;
}

function createCloudBasePositions(
  count: number,
  spread: [number, number],
  minSpacing: number,
  layerIndex: number,
) {
  const spreadX = Math.max(1, Math.abs(spread[0]));
  const spreadZ = Math.max(1, Math.abs(spread[1]));
  const positions: Array<[number, number]> = [];

  for (let index = 0; index < count; index += 1) {
    let bestCandidate: [number, number] | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const normalizedX = count === 1 ? 0.5 : (index + attempt / 24) / (count - 1);
      const candidateX =
        (normalizedX - 0.5) * spreadX +
        Math.sin(index * 1.73 + attempt * 0.91 + layerIndex) * spreadX * 0.08;
      const candidateZ =
        Math.sin(index * 1.21 + attempt * 0.73 + layerIndex * 0.83) * spreadZ * 0.34 +
        Math.cos(index * 0.67 + attempt * 0.57 + layerIndex) * spreadZ * 0.14;

      const nearestDistance = positions.reduce((nearest, [x, z]) => {
        const distance = Math.hypot(candidateX - x, candidateZ - z);
        return Math.min(nearest, distance);
      }, Number.POSITIVE_INFINITY);
      const spacingScore = Math.min(nearestDistance, minSpacing * 1.4);
      const edgeClearance =
        Math.min(spreadX * 0.5 - Math.abs(candidateX), spreadZ * 0.5 - Math.abs(candidateZ)) * 0.08;
      const score = spacingScore + edgeClearance;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = [candidateX, candidateZ];
      }
    }

    positions.push(bestCandidate ?? [0, 0]);
  }

  return positions;
}

function createCloudVoxelGeometry(width: number, height: number, depth: number, blockSize: number, puffCount: number, seed: number) {
  const occupied = new Set<string>();
  const halfWidth = Math.max(2, Math.round(width / blockSize / 2));
  const halfDepth = Math.max(2, Math.round(depth / blockSize / 2));
  const halfHeight = Math.max(1, Math.round(height / blockSize / 2));

  for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
    const centerX = Math.round(Math.sin(seed * 0.73 + puffIndex * 1.11) * halfWidth * 0.55);
    const centerY = Math.round(Math.cos(seed * 0.49 + puffIndex * 0.93) * halfHeight * 0.35);
    const centerZ = Math.round(Math.sin(seed * 0.31 + puffIndex * 0.87) * halfDepth * 0.55);
    const radiusX = 1 + ((seed + puffIndex) % Math.max(2, halfWidth));
    const radiusY = (1 + ((seed + puffIndex * 2) % Math.max(2, halfHeight + 1))) / 2;
    const radiusZ = 1 + ((seed + puffIndex * 3) % Math.max(2, halfDepth));

    for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
      for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
        for (let z = centerZ - radiusZ; z <= centerZ + radiusZ; z += 1) {
          const normalized =
            ((x - centerX) / (radiusX + 0.35)) ** 2 +
            ((y - centerY) / (radiusY + 0.35)) ** 2 +
            ((z - centerZ) / (radiusZ + 0.35)) ** 2;
          const carveNoise = Math.sin((x + seed) * 1.7) + Math.cos((z - seed) * 1.3) + Math.sin((y + puffIndex) * 1.9);

          if (normalized <= 1.04 && carveNoise > -1.45) {
            occupied.add(`${x}:${y}:${z}`);
          }
        }
      }
    }
  }

  const geometries = Array.from(occupied, (key) => {
    const [x, y, z] = key.split(":").map(Number);
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    geometry.translate(x * blockSize, y * blockSize * 0.82, z * blockSize);
    return geometry;
  });

  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());

  if (!merged) {
    const fallback = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    fallback.computeVertexNormals();
    return fallback;
  }

  merged.computeVertexNormals();
  return merged;
}

function SkySystem({
  ambientLightRef,
  hemisphereLightRef,
  directionalLightRef,
}: {
  ambientLightRef: { current: THREE.AmbientLight | null };
  hemisphereLightRef: { current: THREE.HemisphereLight | null };
  directionalLightRef: { current: THREE.DirectionalLight | null };
}) {
  const { camera, scene, clock } = useThree();
  const skyGroupRef = useRef<THREE.Group>(null);
  const domeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const moonMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const starsMaterialRef = useRef<THREE.PointsMaterial>(null);
  const cloudLayerRefs = useRef<Array<THREE.Group | null>>([]);
  const skyTextures = useTexture(uniqueSkyTexturePaths) as THREE.Texture[];
  const fogRef = useRef(new THREE.Fog(worldSky.colors.dayFog, worldSky.fogNear, worldSky.fogFar));
  const backgroundColor = useMemo(() => new THREE.Color(worldSky.colors.dayBackground), []);
  const domeColor = useMemo(() => new THREE.Color(worldSky.colors.dayDome), []);
  const hemisphereSkyColor = useMemo(() => new THREE.Color(worldSky.lighting.dayHemisphereColor), []);
  const hemisphereGroundColor = useMemo(() => new THREE.Color(worldSky.lighting.dayGroundColor), []);
  const directionalColor = useMemo(() => new THREE.Color(worldSky.lighting.sunColor), []);

  const texturesByPath = useMemo(
    () =>
      Object.fromEntries(uniqueSkyTexturePaths.map((path, index) => [path, skyTextures[index]])) as Record<string, THREE.Texture>,
    [skyTextures],
  );

  const cloudMaterials = useMemo(
    () =>
      worldSky.cloudLayers.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#ffffff",
            roughness: 1,
            metalness: 0,
            fog: false,
            transparent: false,
            depthWrite: true,
            flatShading: true,
          }),
      ),
    [],
  );

  const cloudBlobs = useMemo(
    () =>
      worldSky.cloudLayers.map((layer, layerIndex) =>
        createCloudBasePositions(
          layer.count,
          layer.spread,
          layer.minSpacing ?? Math.max(layer.size[0], layer.size[2]) * 2,
          layerIndex,
        ).map(([baseX, baseZ], index) => {
          const sizeScale = 1 + Math.sin(index * 1.17 + layerIndex) * 0.18;
          const heightScale = 1 + Math.cos(index * 1.33 + layerIndex) * 0.14;
          const depthScale = 1 + Math.sin(index * 0.91 + layerIndex * 0.8) * 0.16;
          const width = layer.size[0] * sizeScale;
          const cloudHeight = layer.size[1] * heightScale;
          const depth = layer.size[2] * depthScale;

          return {
            key: `${layerIndex}-${index}`,
            basePosition: [
              baseX,
              layer.height + Math.sin(index * 1.91 + layerIndex) * 3.5,
              baseZ,
            ] as [number, number, number],
            rotation: [
              Math.sin(index * 0.67 + layerIndex) * 0.08,
              Math.sin(index * 0.53 + layerIndex * 0.6) * 0.18,
              Math.cos(index * 0.59 + layerIndex) * 0.05,
            ] as [number, number, number],
            bobPhase: index * 0.71 + layerIndex * 0.93,
            geometry: createCloudVoxelGeometry(width, cloudHeight, depth, layer.blockSize, layer.puffCount, index + layerIndex * 17),
          };
        }),
      ),
    [],
  );

  useEffect(
    () => () => {
      cloudBlobs.forEach((layer) => {
        layer.forEach((cloud) => {
          cloud.geometry.dispose();
        });
      });

      cloudMaterials.forEach((material) => {
        material.dispose();
      });
    },
    [cloudBlobs, cloudMaterials],
  );

  const starPositions = useMemo(() => {
    const values = new Float32Array(worldSky.stars.count * 3);

    for (let index = 0; index < worldSky.stars.count; index += 1) {
      const theta = (index / worldSky.stars.count) * Math.PI * 2 + Math.sin(index * 0.73) * 0.3;
      const phi = 0.35 + (index % 9) * 0.075;
      const radius = worldSky.stars.radius + Math.sin(index * 1.17) * 4;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      values.set([x, y, z], index * 3);
    }

    return values;
  }, []);

  useEffect(() => {
    skyTextures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [skyTextures]);

  useEffect(() => {
    scene.background = backgroundColor;
    scene.fog = fogRef.current;

    return () => {
      scene.fog = null;
    };
  }, [backgroundColor, scene]);

  useFrame(() => {
    if (!skyGroupRef.current) return;

    skyGroupRef.current.position.copy(camera.position);

    const cycleProgress = worldSky.cycle.enabled
      ? (worldSky.cycle.startProgress + clock.getElapsedTime() / worldSky.cycle.secondsPerDay) % 1
      : worldSky.cycle.startProgress;

    const sunOrbit = orbitSkyBody(
      cycleProgress,
      worldSky.sun.orbitRadius,
      worldSky.sun.verticalRadius,
      worldSky.orbit.axis,
      worldSky.orbit.heightOffset,
    );
    const moonOrbit = orbitSkyBody(
      cycleProgress,
      worldSky.moon.orbitRadius,
      worldSky.moon.verticalRadius,
      worldSky.orbit.axis,
      worldSky.orbit.heightOffset,
      Math.PI,
    );

    const daylightBase = THREE.MathUtils.clamp((Math.sin(sunOrbit.angle) + 0.18) / 1.18, 0, 1);
    const daylight = THREE.MathUtils.smoothstep(daylightBase, 0, 1);
    const night = 1 - daylight;

    const sunSprite = skyGroupRef.current.getObjectByName("sky-sun");
    const moonSprite = skyGroupRef.current.getObjectByName("sky-moon");
    if (sunSprite) sunSprite.position.copy(sunOrbit.position);
    if (moonSprite) moonSprite.position.copy(moonOrbit.position);

    skyGroupRef.current.rotation.y = camera.rotation.y * 0.08;

    cloudLayerRefs.current.forEach((layerGroup, index) => {
      if (!layerGroup) return;

      const layer = worldSky.cloudLayers[index];
      const spreadX = Math.max(1, Math.abs(layer.spread[0]));
      const spreadZ = Math.max(1, Math.abs(layer.spread[1]));
      const driftX = layer.driftDirection[0] * layer.driftSpeed * clock.getElapsedTime();
      const driftZ = layer.driftDirection[1] * layer.driftSpeed * clock.getElapsedTime();

      layerGroup.position.set(
        wrapIntoRange(driftX, -spreadX * 0.5, spreadX * 0.5),
        0,
        wrapIntoRange(driftZ, -spreadZ * 0.5, spreadZ * 0.5),
      );
    });

    applyLerpedColor(backgroundColor, worldSky.colors.nightBackground, worldSky.colors.dayBackground, daylight);
    applyLerpedColor(fogRef.current.color, worldSky.colors.nightFog, worldSky.colors.dayFog, daylight);
    applyLerpedColor(domeColor, worldSky.colors.nightDome, worldSky.colors.dayDome, daylight);
    domeMaterialRef.current?.color.copy(domeColor);

    if (sunMaterialRef.current) {
      sunMaterialRef.current.opacity = THREE.MathUtils.lerp(0.18, 1, daylight);
    }

    if (moonMaterialRef.current) {
      moonMaterialRef.current.opacity = THREE.MathUtils.lerp(0.08, 0.95, night);
    }

    if (starsMaterialRef.current) {
      starsMaterialRef.current.opacity = THREE.MathUtils.lerp(0, 0.85, night);
    }

    cloudMaterials.forEach((material) => {
      if (!material) return;

      material.color.set(worldSky.colors.nightFog).lerp(new THREE.Color("#ffffff"), daylight * 0.88);
      material.emissive.set(worldSky.colors.nightFog).lerp(new THREE.Color("#ffffff"), daylight * 0.1);
      material.emissiveIntensity = THREE.MathUtils.lerp(0.04, 0.12, daylight);
    });

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(
        worldSky.lighting.nightAmbient,
        worldSky.lighting.dayAmbient,
        daylight,
      );
    }

    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(
        worldSky.lighting.nightHemisphere,
        worldSky.lighting.dayHemisphere,
        daylight,
      );
      applyLerpedColor(
        hemisphereSkyColor,
        worldSky.lighting.nightHemisphereColor,
        worldSky.lighting.dayHemisphereColor,
        daylight,
      );
      applyLerpedColor(
        hemisphereGroundColor,
        worldSky.lighting.nightGroundColor,
        worldSky.lighting.dayGroundColor,
        daylight,
      );
      hemisphereLightRef.current.color.copy(hemisphereSkyColor);
      hemisphereLightRef.current.groundColor.copy(hemisphereGroundColor);
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(
        worldSky.lighting.nightDirectional,
        worldSky.lighting.dayDirectional,
        daylight,
      );
      applyLerpedColor(directionalColor, worldSky.lighting.moonColor, worldSky.lighting.sunColor, daylight);
      directionalLightRef.current.color.copy(directionalColor);
      directionalLightRef.current.position.copy(sunOrbit.position.clone().normalize().multiplyScalar(42));
    }
  });

  return (
    <>
      <group ref={skyGroupRef}>
        <mesh frustumCulled={false} renderOrder={-20}>
          <sphereGeometry args={[worldSky.domeRadius, 24, 24]} />
          <meshBasicMaterial ref={domeMaterialRef} color={worldSky.colors.dayDome} side={THREE.BackSide} fog={false} depthWrite={false} />
        </mesh>

        <points frustumCulled={false} renderOrder={-18}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={starsMaterialRef}
            color="#f8fbff"
            size={worldSky.stars.size}
            sizeAttenuation
            transparent
            opacity={0}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </points>

        <sprite name="sky-sun" scale={worldSky.sun.scale} renderOrder={10}>
          <spriteMaterial
            ref={sunMaterialRef}
            map={texturesByPath[worldSky.sun.texture]}
            transparent
            alphaTest={0.1}
            fog={false}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </sprite>

        <sprite name="sky-moon" scale={worldSky.moon.scale} renderOrder={11}>
          <spriteMaterial
            ref={moonMaterialRef}
            map={texturesByPath[worldSky.moon.texture]}
            transparent
            alphaTest={0.1}
            fog={false}
            depthWrite={false}
            depthTest
            toneMapped={false}
            opacity={0.1}
          />
        </sprite>
      </group>

      {worldSky.cloudLayers.map((layer, layerIndex) => (
        <group
          key={`cloud-layer-${layerIndex}`}
          ref={(node) => {
            cloudLayerRefs.current[layerIndex] = node;
          }}
          renderOrder={6 + layerIndex}
        >
          {cloudBlobs[layerIndex].map((cloud) => (
            <mesh
              key={cloud.key}
              geometry={cloud.geometry}
              material={cloudMaterials[layerIndex]}
              position={[
                cloud.basePosition[0],
                cloud.basePosition[1] + Math.sin(cloud.bobPhase) * layer.bobAmplitude,
                cloud.basePosition[2],
              ]}
              rotation={cloud.rotation}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      ))}
    </>
  );
}

function InstancedVoxelBlocks({
  materialId,
  positions,
  material,
  faceTextures,
  castShadow = true,
}: {
  materialId: WorldMaterial;
  positions: [number, number, number][];
  material: MaterialDefinition;
  faceTextures: THREE.Texture[];
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;

    positions.forEach((position, index) => {
      dummy.position.set(position[0], position[1], position[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [dummy, positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, positions.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
      userData={{
        terrainMaterial: materialId,
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      {faceTextures.map((texture, index) => (
        <meshStandardMaterial
          key={`${index}-${texture.uuid}`}
          attach={`material-${index}`}
          map={texture}
          color="#ffffff"
          roughness={material.roughness ?? 1}
          metalness={material.metalness ?? 0}
          emissive={material.emissive}
          emissiveIntensity={material.emissiveIntensity}
          transparent={material.transparent}
          alphaTest={material.alphaTest ?? 0}
        />
      ))}
    </instancedMesh>
  );
}

function VoxelWorld({ blocks }: { blocks: WorldBlock[] }) {
  const texturesByPath = useWorldTextures();
  const groupedBlocks = useMemo(
    () => groupBlocksByMaterial(blocks),
    [blocks],
  );
  const faceTexturesByMaterial = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(materialPalette) as WorldMaterial[]).map((material) => [
          material,
          cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths[material][face]]),
        ]),
      ) as Record<WorldMaterial, THREE.Texture[]>,
    [texturesByPath],
  );

  return (
    <>
      {(Object.keys(groupedBlocks) as WorldMaterial[]).map((material) => (
        <InstancedVoxelBlocks
          key={material}
          materialId={material}
          positions={groupedBlocks[material]}
          material={materialPalette[material]}
          faceTextures={faceTexturesByMaterial[material]}
          castShadow={material !== "cloud"}
        />
      ))}
    </>
  );
}

function DroppedBlockItemMesh({
  item,
  faceTextures,
  canCollect,
  onCollect,
}: {
  item: DroppedBlockItem;
  faceTextures: THREE.Texture[];
  canCollect: boolean;
  onCollect: (item: DroppedBlockItem) => void;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const collectedRef = useRef(false);
  const centerXRef = useRef(item.blockPosition[0]);
  const centerYRef = useRef(item.blockPosition[1] + 0.46);
  const centerZRef = useRef(item.blockPosition[2]);
  const horizontalVelocityRef = useRef(new THREE.Vector2(item.drift[0], item.drift[1]));
  const verticalVelocityRef = useRef(1.8);
  const groundedRef = useRef(false);
  const itemHalfSize = 0.17;
  const itemGravity = 9.8;
  const bounceDamping = 0.22;
  const airDrag = 0.92;
  const groundFriction = 0.74;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const supportTop = getHighestSupportBelow(centerXRef.current, centerYRef.current - itemHalfSize, centerZRef.current);
    const groundCenterY = supportTop + itemHalfSize;

    centerXRef.current += horizontalVelocityRef.current.x * delta;
    centerZRef.current += horizontalVelocityRef.current.y * delta;

    if (!groundedRef.current) {
      verticalVelocityRef.current -= itemGravity * delta;
      centerYRef.current += verticalVelocityRef.current * delta;
      horizontalVelocityRef.current.multiplyScalar(Math.pow(airDrag, delta * 60));

      if (centerYRef.current <= groundCenterY) {
        centerYRef.current = groundCenterY;

        if (Math.abs(verticalVelocityRef.current) > 0.45) {
          verticalVelocityRef.current = Math.abs(verticalVelocityRef.current) * bounceDamping;
        } else {
          verticalVelocityRef.current = 0;
          groundedRef.current = true;
        }
      }
    } else {
      horizontalVelocityRef.current.multiplyScalar(Math.pow(groundFriction, delta * 60));
    }

    const bob = groundedRef.current ? Math.sin(state.clock.elapsedTime * 3.2 + item.phase) * 0.045 : 0;

    groupRef.current.position.set(centerXRef.current, centerYRef.current + bob, centerZRef.current);
    groupRef.current.rotation.set(0.28, state.clock.elapsedTime * 1.7 + item.phase, 0);

    if (!canCollect || collectedRef.current) {
      return;
    }

    const pickupDistance = groundedRef.current ? 0.7 : 0.7;
    const horizontalDistance = Math.hypot(
      groupRef.current.position.x - camera.position.x,
      groupRef.current.position.z - camera.position.z,
    );

    if (horizontalDistance <= pickupDistance) {
      collectedRef.current = true;
      onCollect(item);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        {faceTextures.map((texture, index) => (
          <meshStandardMaterial
            key={`dropped-item-${item.id}-${index}-${texture.uuid}`}
            attach={`material-${index}`}
            map={texture}
            color="#ffffff"
            roughness={0.92}
            metalness={0}
          />
        ))}
      </mesh>
    </group>
  );
}

function DroppedBlockItems({
  items,
  canCollect,
  onCollect,
}: {
  items: DroppedBlockItem[];
  canCollect: boolean;
  onCollect: (item: DroppedBlockItem) => void;
}) {
  const texturesByPath = useWorldTextures();
  const faceTexturesByMaterial = useMemo(
    () =>
      ({
        dirt: cubeFaceOrder.map(() => texturesByPath["/textures/world/dirt.svg"]),
        wood: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.wood[face]]),
      }) satisfies Record<DroppedBlockItem["material"], THREE.Texture[]>,
    [texturesByPath],
  );

  return (
    <>
      {items.map((item) => (
        <DroppedBlockItemMesh
          key={item.id}
          item={item}
          faceTextures={faceTexturesByMaterial[item.material]}
          canCollect={canCollect}
          onCollect={onCollect}
        />
      ))}
    </>
  );
}

function TerrainImpactParticles({ trigger, enabled }: { trigger: number; enabled: boolean }) {
  const { camera, scene } = useThree();
  const texturesByPath = useWorldTextures();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meshRefs = useRef({} as Record<Exclude<WorldMaterial, "cloud">, THREE.InstancedMesh | null>);
  const poolsRef = useRef(
    Object.fromEntries(
      terrainImpactMaterials.map((material) => [
        material,
        {
          positions: Array.from({ length: terrainImpactConfig.maxParticlesPerMaterial }, () => new THREE.Vector3(9999, 9999, 9999)),
          velocities: Array.from({ length: terrainImpactConfig.maxParticlesPerMaterial }, () => new THREE.Vector3(9999, 9999, 9999)),
          rotations: Array.from({ length: terrainImpactConfig.maxParticlesPerMaterial }, () => new THREE.Euler()),
          angularVelocities: Array.from({ length: terrainImpactConfig.maxParticlesPerMaterial }, () => new THREE.Vector3()),
          lifetimes: Array.from({ length: terrainImpactConfig.maxParticlesPerMaterial }, () => ({ age: 1, ttl: 0 })),
          nextParticle: 0,
        },
      ]),
    ) as Record<
      Exclude<WorldMaterial, "cloud">,
      {
        positions: THREE.Vector3[];
        velocities: THREE.Vector3[];
        rotations: THREE.Euler[];
        angularVelocities: THREE.Vector3[];
        lifetimes: Array<{ age: number; ttl: number }>;
        nextParticle: number;
      }
    >,
  );
  const spawnOriginRef = useRef(new THREE.Vector3());
  const spawnNormalRef = useRef(new THREE.Vector3(0, 1, 0));
  const tangentRef = useRef(new THREE.Vector3());
  const bitangentRef = useRef(new THREE.Vector3());
  const randomDirectionRef = useRef(new THREE.Vector3());
  const normalMatrixRef = useRef(new THREE.Matrix3());
  const hiddenScale = 0.0001;

  const fragmentTexturesByMaterial = useMemo(
    () =>
      Object.fromEntries(
        terrainImpactMaterials.map((material) => [
          material,
          cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths[material][face]]),
        ]),
      ) as Record<Exclude<WorldMaterial, "cloud">, THREE.Texture[]>,
    [texturesByPath],
  );

  const syncPoolMesh = useCallback(
    (material: Exclude<WorldMaterial, "cloud">) => {
      const mesh = meshRefs.current[material];
      const pool = poolsRef.current[material];

      if (!mesh) return;

      for (let index = 0; index < terrainImpactConfig.maxParticlesPerMaterial; index += 1) {
        const lifetime = pool.lifetimes[index];
        const scale =
          lifetime.age >= lifetime.ttl
            ? hiddenScale
            : terrainImpactConfig.fragmentSize * (1 - THREE.MathUtils.smoothstep(lifetime.age / lifetime.ttl, 0, 1) * 0.35);

        dummy.position.copy(pool.positions[index]);
        dummy.rotation.copy(pool.rotations[index]);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    [dummy, hiddenScale],
  );

  useEffect(() => {
    terrainImpactMaterials.forEach((material) => {
      syncPoolMesh(material);
    });
  }, [syncPoolMesh]);

  useEffect(() => {
    if (!enabled || trigger === 0) return;

    const terrainHit = getCenterTerrainHit(raycaster, camera, scene, terrainImpactConfig.maxDistance);

    if (!terrainHit) return;

    const pool = poolsRef.current[terrainHit.terrainMaterial];

    spawnOriginRef.current.set(...terrainHit.blockPosition).addScaledVector(terrainHit.normal, 0.5);
    spawnOriginRef.current.lerp(terrainHit.point, 0.45);
    spawnNormalRef.current.copy(terrainHit.normal);

    const tangentSeed =
      Math.abs(spawnNormalRef.current.y) > 0.82 ? tangentRef.current.set(1, 0, 0) : tangentRef.current.set(0, 1, 0);

    tangentRef.current.crossVectors(spawnNormalRef.current, tangentSeed).normalize();
    bitangentRef.current.crossVectors(spawnNormalRef.current, tangentRef.current).normalize();

    for (let index = 0; index < terrainImpactConfig.particlesPerBurst; index += 1) {
      const particleIndex = pool.nextParticle;
      pool.nextParticle = (pool.nextParticle + 1) % terrainImpactConfig.maxParticlesPerMaterial;
      const offsetA = (Math.random() - 0.5) * 0.18;
      const offsetB = (Math.random() - 0.5) * 0.18;

      pool.positions[particleIndex].set(
        spawnOriginRef.current.x + spawnNormalRef.current.x * 0.08 + tangentRef.current.x * offsetA + bitangentRef.current.x * offsetB,
        spawnOriginRef.current.y + spawnNormalRef.current.y * 0.08 + tangentRef.current.y * offsetA + bitangentRef.current.y * offsetB,
        spawnOriginRef.current.z + spawnNormalRef.current.z * 0.08 + tangentRef.current.z * offsetA + bitangentRef.current.z * offsetB,
      );

      randomDirectionRef.current.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
      pool.velocities[particleIndex]
        .copy(spawnNormalRef.current)
        .multiplyScalar(terrainImpactConfig.burstVelocity)
        .addScaledVector(randomDirectionRef.current, terrainImpactConfig.randomVelocity);
      pool.rotations[particleIndex].set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pool.angularVelocities[particleIndex].set(
        (Math.random() - 0.5) * terrainImpactConfig.angularVelocity,
        (Math.random() - 0.5) * terrainImpactConfig.angularVelocity,
        (Math.random() - 0.5) * terrainImpactConfig.angularVelocity,
      );

      pool.lifetimes[particleIndex] = {
        age: 0,
        ttl: 0.18 + Math.random() * 0.22,
      };
    }

    syncPoolMesh(terrainHit.terrainMaterial);
  }, [camera, enabled, raycaster, scene, syncPoolMesh, trigger]);

  useFrame((_state, delta) => {
    terrainImpactMaterials.forEach((material) => {
      const pool = poolsRef.current[material];
      let materialNeedsUpdate = false;

      for (let index = 0; index < terrainImpactConfig.maxParticlesPerMaterial; index += 1) {
        const lifetime = pool.lifetimes[index];

        if (lifetime.age >= lifetime.ttl) {
          continue;
        }

        lifetime.age += delta;

        if (lifetime.age >= lifetime.ttl) {
          pool.positions[index].set(9999, 9999, 9999);
          materialNeedsUpdate = true;
          continue;
        }

        pool.velocities[index].y -= terrainImpactConfig.gravity * delta;
        pool.positions[index].addScaledVector(pool.velocities[index], delta);
        pool.rotations[index].x += pool.angularVelocities[index].x * delta;
        pool.rotations[index].y += pool.angularVelocities[index].y * delta;
        pool.rotations[index].z += pool.angularVelocities[index].z * delta;
        materialNeedsUpdate = true;
      }

      if (materialNeedsUpdate) {
        syncPoolMesh(material);
      }
    });
  }, 0);

  return (
    <>
      {terrainImpactMaterials.map((material) => (
        (() => {
          const materialDefinition: MaterialDefinition = materialPalette[material];

          return (
            <instancedMesh
              key={`terrain-impact-${material}`}
              ref={(node) => {
                meshRefs.current[material] = node;
              }}
              args={[undefined, undefined, terrainImpactConfig.maxParticlesPerMaterial]}
              frustumCulled={false}
              renderOrder={5}
            >
              <boxGeometry args={[1, 1, 1]} />
              {fragmentTexturesByMaterial[material].map((texture, index) => (
                <meshStandardMaterial
                  key={`terrain-impact-${material}-${index}-${texture.uuid}`}
                  attach={`material-${index}`}
                  map={texture}
                  color="#ffffff"
                  roughness={materialDefinition.roughness ?? 1}
                  metalness={materialDefinition.metalness ?? 0}
                  emissive={materialDefinition.emissive}
                  emissiveIntensity={materialDefinition.emissiveIntensity}
                  transparent={materialDefinition.transparent}
                  alphaTest={materialDefinition.alphaTest ?? 0}
                />
              ))}
            </instancedMesh>
          );
        })()
      ))}
    </>
  );
}

function TerrainBreakOverlay({
  trigger,
  enabled,
  swingHeld,
  removedBlockKeys,
  onBreakBlock,
}: {
  trigger: number;
  enabled: boolean;
  swingHeld: boolean;
  removedBlockKeys: Set<string>;
  onBreakBlock: (block: BreakableTerrainHit) => void;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const textures = useTexture(Array.from(blockBreakTexturePaths)) as THREE.Texture[];
  const [overlayState, setOverlayState] = useState<{
    blockKey: string;
    blockPosition: [number, number, number];
    terrainMaterial: Exclude<WorldMaterial, "cloud">;
    hits: number;
  } | null>(null);

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  useEffect(() => {
    if (!enabled || trigger === 0) return;

    const terrainHit = getCenterTerrainHit(raycaster, camera, scene, terrainImpactConfig.maxDistance);

    if (!terrainHit || (removedBlockKeys.has(terrainHit.blockKey) && !activePlacedTerrainBlocks.has(terrainHit.blockKey))) return;

    setOverlayState((current) => {
      if (current?.blockKey === terrainHit.blockKey) {
        return {
          ...current,
          hits: current.hits + 1,
          blockPosition: terrainHit.blockPosition,
        };
      }

      return {
        blockKey: terrainHit.blockKey,
        blockPosition: terrainHit.blockPosition,
        terrainMaterial: terrainHit.terrainMaterial,
        hits: 1,
      };
    });
  }, [camera, enabled, raycaster, removedBlockKeys, scene, trigger]);

  useEffect(() => {
    if (!overlayState || (removedBlockKeys.has(overlayState.blockKey) && !activePlacedTerrainBlocks.has(overlayState.blockKey))) return;
    if (overlayState.hits < blockBreakHitsRequired[overlayState.terrainMaterial]) return;

    onBreakBlock({
      blockKey: overlayState.blockKey,
      blockPosition: overlayState.blockPosition,
      terrainMaterial: overlayState.terrainMaterial,
    });
    setOverlayState(null);
  }, [onBreakBlock, overlayState, removedBlockKeys]);

  useFrame(() => {
    if (!enabled || !swingHeld) {
      setOverlayState((current) => (current ? null : current));
      return;
    }

    const terrainHit = getCenterTerrainHit(raycaster, camera, scene, terrainImpactConfig.maxDistance);

    setOverlayState((current) => {
      if (!current) return current;
      if ((removedBlockKeys.has(current.blockKey) && !activePlacedTerrainBlocks.has(current.blockKey)) || !terrainHit || terrainHit.blockKey !== current.blockKey) {
        return null;
      }

      if (
        current.blockPosition[0] !== terrainHit.blockPosition[0] ||
        current.blockPosition[1] !== terrainHit.blockPosition[1] ||
        current.blockPosition[2] !== terrainHit.blockPosition[2]
      ) {
        return {
          ...current,
          blockPosition: terrainHit.blockPosition,
        };
      }

      return current;
    });
  });

  if (!overlayState) return null;

  const hitsRequired = blockBreakHitsRequired[overlayState.terrainMaterial];
  const stage = Math.min(
    textures.length - 1,
    Math.floor(
      (Math.max(0, Math.min(overlayState.hits - 1, hitsRequired - 1)) / Math.max(1, hitsRequired - 1)) * textures.length,
    ),
  );
  const stageTexture = textures[stage];

  return (
    <mesh position={overlayState.blockPosition} scale={[1.018, 1.018, 1.018]} frustumCulled={false} renderOrder={4}>
      <boxGeometry args={[1, 1, 1]} />
      {cubeFaceOrder.map((face, index) => (
        <meshBasicMaterial
          key={`block-break-${face}-${stage}-${stageTexture.uuid}`}
          attach={`material-${index}`}
          map={stageTexture}
          color="#ffffff"
          transparent
          alphaTest={0.05}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          toneMapped={false}
        />
      ))}
    </mesh>
  );
}

function BlockPlacementController({
  enabled,
  heldInventoryMaterial,
  availableCount,
  onPlaceBlock,
  onPlaceSwing,
}: {
  enabled: boolean;
  heldInventoryMaterial: DroppedBlockItem["material"] | null;
  availableCount: number;
  onPlaceBlock: (material: DroppedBlockItem["material"], blockPosition: [number, number, number]) => void;
  onPlaceSwing: () => void;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const tryPlaceBlock = useCallback(() => {
    if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;

    const terrainHit = getCenterTerrainHit(raycaster, camera, scene, terrainImpactConfig.maxDistance);
    if (!terrainHit) return;

    const blockPosition = getPlacementPositionFromHit(terrainHit);
    const blockKey = getBlockKey(blockPosition);

    if (
      blockPosition[0] < worldBounds.minX ||
      blockPosition[0] > worldBounds.maxX ||
      blockPosition[2] < worldBounds.minZ ||
      blockPosition[2] > worldBounds.maxZ
    ) {
      return;
    }

    if (isOccupiedTerrainBlockKey(blockKey) || blockIntersectsPlayer(blockPosition, camera.position)) {
      return;
    }

    onPlaceBlock(heldInventoryMaterial, blockPosition);
    onPlaceSwing();
  }, [availableCount, camera, enabled, heldInventoryMaterial, onPlaceBlock, onPlaceSwing, raycaster, scene]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;
      event.preventDefault();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) return;
      if (!enabled || !heldInventoryMaterial || availableCount <= 0) return;

      event.preventDefault();
      tryPlaceBlock();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [availableCount, enabled, heldInventoryMaterial, tryPlaceBlock]);

  return null;
}

function PlayerArmViewmodel({
  moving,
  swingTick,
  placeSwingTick,
  swingHeld,
  onSwingCycle,
  heldInventoryMaterial,
}: {
  moving: boolean;
  swingTick: number;
  placeSwingTick: number;
  swingHeld: boolean;
  onSwingCycle: () => void;
  heldInventoryMaterial: DroppedBlockItem["material"] | null;
}) {
  const armRef = useRef<THREE.Group>(null);
  const bobPhaseRef = useRef(0);
  const bobBlendRef = useRef(0);
  const swingProgressRef = useRef(1);
  const armTextures = useArmTextures();
  const hotbarPreviewTextures = useHotbarPreviewTextures();
  const arm_rotation: [number, number, number] = [-0.55, 0.22, -0.08];
  const arm_position: [number, number, number] = [0.98, -1.14, 0];
  const held_block_position: [number, number, number] = [0.05, -0.15, 0] //[0.28, -0.8, 0.36];
  const held_block_rotation: [number, number, number] = [0.8, 1.1, .3];
  const held_block_scale = 0.72;
  const swing_duration = 0.22;

  const swing_position_delta: [number, number, number] = [-0.1, -0.12, -0.5];
  const swing_rotation_delta: [number, number, number] = [-0.66, 0.24, 0.9]; // pitch, yaw, roll in radians

  useEffect(() => {
    swingProgressRef.current = 0;
    onSwingCycle();
  }, [onSwingCycle, swingTick]);

  useEffect(() => {
    if (placeSwingTick === 0) return;
    swingProgressRef.current = 0;
  }, [placeSwingTick]);

  useFrame((_state, delta) => {
    if (!armRef.current) return;

    bobBlendRef.current = THREE.MathUtils.damp(bobBlendRef.current, moving ? 1 : 0, 8, delta);
    bobPhaseRef.current += delta * THREE.MathUtils.lerp(1.3, 10.5, bobBlendRef.current);
    swingProgressRef.current += delta / swing_duration;

    if (swingProgressRef.current >= 1) {
      if (swingHeld) {
        swingProgressRef.current = 0;
        onSwingCycle();
      } else {
        swingProgressRef.current = 1;
      }
    }

    const bobX = Math.sin(bobPhaseRef.current) * 0.05 * bobBlendRef.current;
    const bobY = Math.abs(Math.cos(bobPhaseRef.current * 0.9)) * 0.06 * bobBlendRef.current;
    const swingProgress = swingProgressRef.current;
    const strikePhase = .34;
    const swing =
      swingProgress < strikePhase
        ? THREE.MathUtils.smootherstep(swingProgress / strikePhase, 0, 1)
        : 1 - THREE.MathUtils.smoothstep((swingProgress - strikePhase) / (1 - strikePhase), 0, 1) * 0.92;

    armRef.current.position.set(arm_position[0] + bobX + swing * swing_position_delta[0], arm_position[1] + bobY - swing * swing_position_delta[1], arm_position[2] + swing * swing_position_delta[2]);
    armRef.current.rotation.set(
      arm_rotation[0] - bobY * 0.25 + swing * swing_rotation_delta[0],
      arm_rotation[1] - bobX * 0.18 + swing * swing_rotation_delta[1],
      arm_rotation[2] + bobX * 0.7 + swing * swing_rotation_delta[2],
    );
  });
  return (
    <>
      <ambientLight intensity={1} />
      {/* Arm viewmodel local transform cheat sheet:
          rotation[0] / x: pitch the arm up or down on screen
          rotation[1] / y: yaw the arm inward toward screen center or outward toward the edge
          rotation[2] / z: roll the arm clockwise/counterclockwise
          To rotate the arm in toward the screen center, usually adjust rotation[1].
          To rotate it farther out toward the screen edge, adjust rotation[1] the opposite way. */}
      <group ref={armRef} position={[0.88, -0.96, 0]} rotation={arm_rotation} scale={1.45}>
        <group visible={!heldInventoryMaterial}>
          <mesh frustumCulled={false} position={[0.02, -0.24, -0.006]}>
            <boxGeometry args={[0.29, 1.04, 0.29]} />
            {armTextures.skin.map((texture, index) => (
              <meshBasicMaterial
                key={`skin-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest
                depthWrite
                toneMapped={false}
              />
            ))}
          </mesh>
          {armRenderFlags.sleeve ? (
            <mesh frustumCulled={false} position={[0.02, 0.19, 0.016]}>
              <boxGeometry args={[0.325, 0.3, 0.325]} />
              {armTextures.sleeve.map((texture, index) => (
                <meshBasicMaterial
                  key={`sleeve-${index}-${texture.uuid}`}
                  attach={`material-${index}`}
                  map={texture}
                  color="#ffffff"
                  depthTest
                  depthWrite
                  toneMapped={false}
                />
              ))}
            </mesh>
          ) : null}
          {armRenderFlags.cuff ? (
            <mesh frustumCulled={false} position={[0.02, 0.31, 0.02]}>
              <boxGeometry args={[0.345, 0.08, 0.345]} />
              {armTextures.cuff.map((texture, index) => (
                <meshBasicMaterial
                  key={`cuff-${index}-${texture.uuid}`}
                  attach={`material-${index}`}
                  map={texture}
                  color="#ffffff"
                  depthTest
                  depthWrite
                  toneMapped={false}
                />
              ))}
            </mesh>
          ) : null}
        </group>
        {heldInventoryMaterial ? (
          <mesh
            frustumCulled={false}
            position={held_block_position}
            rotation={held_block_rotation}
            scale={held_block_scale}
            renderOrder={6}
          >
            <boxGeometry args={[1, 1, 1]} />
            {hotbarPreviewTextures[heldInventoryMaterial].map((texture, index) => (
              <meshBasicMaterial
                key={`arm-preview-${heldInventoryMaterial}-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest
                depthWrite
                toneMapped={false}
              />
            ))}
          </mesh>
        ) : null}
      </group>
    </>
  );
}

function PlayerController({
  enabled,
  onMovingChange,
  jumpTick,
}: {
  enabled: boolean;
  onMovingChange: (moving: boolean) => void;
  jumpTick: number;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const movingRef = useRef(false);
  const jumpQueuedRef = useRef(false);
  const verticalVelocityRef = useRef(0);
  const groundedRef = useRef(true);
  const jumpVelocity = 7.1;
  const gravity = 22;

  useEffect(() => {
    camera.position.set(0, playerCollisionConfig.eyeHeight, 5.5);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
  }, [camera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        jumpQueuedRef.current = true;
      }
      keysRef.current[event.code] = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (jumpTick === 0) return;
    jumpQueuedRef.current = true;
  }, [jumpTick]);

  useEffect(() => {
    if (enabled || !movingRef.current) return;
    movingRef.current = false;
    onMovingChange(false);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
    camera.position.y = playerCollisionConfig.eyeHeight;
  }, [camera, enabled, onMovingChange]);

  useFrame((_state, delta) => {
    if (!enabled) return;
    const speed = 4.25;
    const currentFeetY = camera.position.y - playerCollisionConfig.eyeHeight;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    const movement = new THREE.Vector3();

    if (keysRef.current.KeyW) movement.add(forward);
    if (keysRef.current.KeyS) movement.sub(forward);
    if (keysRef.current.KeyA) movement.sub(right);
    if (keysRef.current.KeyD) movement.add(right);

    const wantsToMove = movement.lengthSq() > 0;
    if (movingRef.current !== wantsToMove) {
      movingRef.current = wantsToMove;
      onMovingChange(wantsToMove);
    }

    let nextX = camera.position.x;
    let nextZ = camera.position.z;
    let nextFeetY = currentFeetY;

    if (wantsToMove) {
      movement.normalize().multiplyScalar(speed * delta);

      const candidateX = camera.position.x + movement.x;
      const candidateZ = camera.position.z + movement.z;

      if (canPlayerOccupyPosition(candidateX, nextFeetY, camera.position.z)) {
        nextX = candidateX;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpHeight(candidateX, nextFeetY, camera.position.z);
        if (steppedFeetY !== null) {
          nextX = candidateX;
          nextFeetY = steppedFeetY;
        }
      }

      if (canPlayerOccupyPosition(nextX, nextFeetY, candidateZ)) {
        nextZ = candidateZ;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpHeight(nextX, nextFeetY, candidateZ);
        if (steppedFeetY !== null) {
          nextZ = candidateZ;
          nextFeetY = steppedFeetY;
        }
      }
    }

    if (jumpQueuedRef.current && groundedRef.current) {
      verticalVelocityRef.current = jumpVelocity;
      groundedRef.current = false;
    }

    jumpQueuedRef.current = false;
    verticalVelocityRef.current -= gravity * delta;
    const targetFeetY = nextFeetY + verticalVelocityRef.current * delta;

    if (verticalVelocityRef.current > 0) {
      nextFeetY = resolveUpwardFeetPosition(nextX, nextFeetY, targetFeetY, nextZ);
      if (nextFeetY < targetFeetY) {
        verticalVelocityRef.current = 0;
      }
      groundedRef.current = false;
    } else {
      const supportFeetY = getHighestSupportBelow(nextX, nextFeetY + playerCollisionConfig.stepHeight, nextZ);

      if (targetFeetY <= supportFeetY) {
        nextFeetY = supportFeetY;
        verticalVelocityRef.current = 0;
        groundedRef.current = true;
      } else {
        nextFeetY = targetFeetY;
        const snappedSupportY = getHighestSupportBelow(nextX, nextFeetY + playerCollisionConfig.groundSnapDistance, nextZ);

        if (snappedSupportY >= nextFeetY && snappedSupportY - nextFeetY <= playerCollisionConfig.groundSnapDistance) {
          nextFeetY = snappedSupportY;
          verticalVelocityRef.current = 0;
          groundedRef.current = true;
        } else {
          groundedRef.current = false;
        }
      }
    }

    camera.position.set(nextX, nextFeetY + playerCollisionConfig.eyeHeight, nextZ);
  });

  return null;
}

function InteractionRaycast({ onTarget }: { onTarget: (id: InteractionId | null, label: string | null) => void }) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastTargetRef = useRef<{ id: InteractionId | null; label: string | null }>({ id: null, label: null });

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((entry) => (entry.object.userData?.interactionId as InteractionId | undefined));

    const nextTarget = hit
      ? {
          id: hit.object.userData.interactionId as InteractionId,
          label: hit.object.userData.label as string,
        }
      : { id: null, label: null };

    if (lastTargetRef.current.id === nextTarget.id && lastTargetRef.current.label === nextTarget.label) {
      return;
    }

    lastTargetRef.current = nextTarget;

    if (!hit) {
      onTarget(null, null);
      return;
    }

    onTarget(nextTarget.id, nextTarget.label);
  });

  return null;
}

function InteractableLandmark({ id, isActive }: { id: InteractionId; isActive: boolean }) {
  const landmark = landmarks.find((entry) => entry.id === id);

  if (!landmark) return null;

  const accentColor = materialPalette[landmark.accent].uiColor;

  return (
    <group position={landmark.position}>
      <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.3, 1.6]} />
        <meshStandardMaterial color="#cdbb97" roughness={0.96} />
      </mesh>

      <mesh
        position={[0, 0.35, 0]}
        castShadow
        receiveShadow
        userData={{ interactionId: landmark.id, label: landmark.label }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
        }}
      >
        <boxGeometry args={[1.15, 1.15, 1.15]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.76}
          emissive={accentColor}
          emissiveIntensity={isActive ? 0.25 : 0.12}
        />
      </mesh>

      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#f8efc1" emissive="#f8efc1" emissiveIntensity={isActive ? 0.42 : 0.18} />
      </mesh>
    </group>
  );
}

export default function GameScene() {
  const [target, setTarget] = useState<InteractionId | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<InteractionId | null>(null);
  const [locked, setLocked] = useState(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const [armSwingTick, setArmSwingTick] = useState(0);
  const [placeSwingTick, setPlaceSwingTick] = useState(0);
  const [armSwingHeld, setArmSwingHeld] = useState(false);
  const [terrainImpactTrigger, setTerrainImpactTrigger] = useState(0);
  const [jumpTick, setJumpTick] = useState(0);
  const [removedTerrainBlockKeys, setRemovedTerrainBlockKeys] = useState<Set<string>>(() => new Set());
  const [placedTerrainBlocks, setPlacedTerrainBlocks] = useState<WorldBlock[]>([]);
  const [droppedItems, setDroppedItems] = useState<DroppedBlockItem[]>([]);
  const [hoveredInventoryMaterial, setHoveredInventoryMaterial] = useState<DroppedBlockItem["material"] | null>(null);
  const [selectedInventorySlot, setSelectedInventorySlot] = useState(0);
  const [collectedInventory, setCollectedInventory] = useState<Record<DroppedBlockItem["material"], number>>({
    dirt: 0,
    wood: 0,
  });
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  const onTarget = useCallback((id: InteractionId | null, label: string | null) => {
    setTarget(id);
    setTargetLabel(label);
  }, []);

  const triggerTerrainImpact = useCallback(() => {
    setTerrainImpactTrigger((current) => current + 1);
  }, []);

  const triggerPlacementSwing = useCallback(() => {
    setPlaceSwingTick((current) => current + 1);
  }, []);

  const triggerJump = useCallback(() => {
    setJumpTick((current) => current + 1);
  }, []);

  const removeTerrainBlock = useCallback((block: BreakableTerrainHit) => {
    if (activePlacedTerrainBlocks.has(block.blockKey)) {
      setPlacedTerrainBlocks((current) => current.filter((entry) => getBlockKey(entry.position) !== block.blockKey));
    } else {
      if (activeRemovedTerrainBlockKeys.has(block.blockKey)) return;

      activeRemovedTerrainBlockKeys = new Set(activeRemovedTerrainBlockKeys).add(block.blockKey);
      setRemovedTerrainBlockKeys(activeRemovedTerrainBlockKeys);
    }

    const droppedMaterial =
      block.terrainMaterial === "wood"
        ? "wood"
        : block.terrainMaterial === "grass" || block.terrainMaterial === "grassShade" || block.terrainMaterial === "dirt"
          ? "dirt"
        : null;

    if (droppedMaterial) {
      setDroppedItems((current) => [
        ...current,
        (() => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.9 + Math.random() * 0.45;

          return {
            id: `${block.blockKey}-${current.length}-${Date.now()}`,
            material: droppedMaterial,
            blockPosition: block.blockPosition,
            spawnedAt: performance.now() / 1000,
            phase: Math.random() * Math.PI * 2,
            drift: [Math.cos(angle) * speed, Math.sin(angle) * speed] as [number, number],
          };
        })(),
      ]);
    }
  }, []);

  const collectDroppedItem = useCallback((item: DroppedBlockItem) => {
    setDroppedItems((current) => current.filter((entry) => entry.id !== item.id));
    setCollectedInventory((current) => ({
      ...current,
      [item.material]: current[item.material] + 1,
    }));
  }, []);

  const placeTerrainBlock = useCallback((material: DroppedBlockItem["material"], blockPosition: [number, number, number]) => {
    const blockKey = getBlockKey(blockPosition);
    const worldMaterial: Extract<WorldMaterial, "dirt" | "wood"> = material === "wood" ? "wood" : "dirt";

    setCollectedInventory((current) => {
      if (current[material] <= 0) return current;
      return {
        ...current,
        [material]: current[material] - 1,
      };
    });

    setPlacedTerrainBlocks((current) => {
      if (current.some((entry) => getBlockKey(entry.position) === blockKey)) return current;
      return [...current, { position: blockPosition, material: worldMaterial, solid: true }];
    });
  }, []);

  useEffect(() => {
    activeRemovedTerrainBlockKeys = removedTerrainBlockKeys;
  }, [removedTerrainBlockKeys]);

  useEffect(() => {
    activePlacedTerrainBlocks = new Map(placedTerrainBlocks.map((block) => [getBlockKey(block.position), block]));
    activePlacedSolidColumns = buildSolidColumns(placedTerrainBlocks);
  }, [placedTerrainBlocks]);

  useEffect(() => {
    const handleHotbarKeyDown = (event: KeyboardEvent) => {
      if (!locked || activePanel) return;
      if (!event.code.startsWith("Digit")) return;

      const nextSlot = Number(event.code.replace("Digit", "")) - 1;
      if (!Number.isInteger(nextSlot) || nextSlot < 0 || nextSlot >= hotbarSlotCount) return;

      event.preventDefault();
      setSelectedInventorySlot(nextSlot);
    };

    window.addEventListener("keydown", handleHotbarKeyDown);
    return () => window.removeEventListener("keydown", handleHotbarKeyDown);
  }, [activePanel, locked]);

  useEffect(() => {
    const handleClick = () => {
      if (!locked || !target) return;
      setActivePanel(target);
      document.exitPointerLock();
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [locked, target]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!locked || event.button !== 0) return;
      setArmSwingHeld(true);
      setArmSwingTick((current) => current + 1);
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [locked]);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      setArmSwingHeld(false);
    };

    const handleWindowBlur = () => {
      setArmSwingHeld(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (locked && !activePanel) return;
    setHoveredInventoryMaterial(null);
  }, [activePanel, locked]);

  const visibleInventoryMaterials = useMemo(
    () => collectedInventoryMaterials.filter((material) => collectedInventory[material] > 0),
    [collectedInventory],
  );
  const selectedInventoryMaterial = visibleInventoryMaterials[selectedInventorySlot] ?? null;
  const heldInventoryMaterial = hoveredInventoryMaterial ?? selectedInventoryMaterial;
  const visibleTerrainBlocks = useMemo(
    () => [
      ...worldBlocks.filter((block) => !removedTerrainBlockKeys.has(getBlockKey(block.position))),
      ...placedTerrainBlocks,
    ],
    [placedTerrainBlocks, removedTerrainBlockKeys],
  );

  const content = activePanel ? interactionContent[activePanel] : null;

  return (
    <div className="scene-shell">
      <Canvas camera={{ fov: 70 }} shadows style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <ambientLight ref={ambientLightRef} intensity={worldSky.lighting.dayAmbient} />
        <hemisphereLight
          ref={hemisphereLightRef}
          intensity={worldSky.lighting.dayHemisphere}
          color={worldSky.lighting.dayHemisphereColor}
          groundColor={worldSky.lighting.dayGroundColor}
        />
        <directionalLight
          ref={directionalLightRef}
          intensity={worldSky.lighting.dayDirectional}
          position={[9, 12, 4]}
          color={worldSky.lighting.sunColor}
          castShadow
        />

        <SkySystem
          ambientLightRef={ambientLightRef}
          hemisphereLightRef={hemisphereLightRef}
          directionalLightRef={directionalLightRef}
        />
        <VoxelWorld blocks={visibleTerrainBlocks} />
        <DroppedBlockItems items={droppedItems} canCollect={locked && !activePanel} onCollect={collectDroppedItem} />
        <TerrainImpactParticles trigger={terrainImpactTrigger} enabled={locked && !activePanel} />
        <TerrainBreakOverlay
          trigger={terrainImpactTrigger}
          enabled={locked && !activePanel}
          swingHeld={armSwingHeld}
          removedBlockKeys={removedTerrainBlockKeys}
          onBreakBlock={removeTerrainBlock}
        />
        <BlockPlacementController
          enabled={locked && !activePanel}
          heldInventoryMaterial={heldInventoryMaterial}
          availableCount={heldInventoryMaterial ? collectedInventory[heldInventoryMaterial] : 0}
          onPlaceBlock={placeTerrainBlock}
          onPlaceSwing={triggerPlacementSwing}
        />
        {landmarks.map((landmark) => (
          <InteractableLandmark key={landmark.id} id={landmark.id} isActive={target === landmark.id} />
        ))}

        {(locked || heldInventoryMaterial) && !activePanel ? (
          <Hud renderPriority={1}>
            <PerspectiveCamera makeDefault position={[0, 0, 3.2]} fov={48} />
            <PlayerArmViewmodel
              moving={playerMoving}
              swingTick={armSwingTick}
              placeSwingTick={placeSwingTick}
              swingHeld={armSwingHeld}
              onSwingCycle={triggerTerrainImpact}
              heldInventoryMaterial={heldInventoryMaterial}
            />
          </Hud>
        ) : null}

        <PlayerController enabled={locked} onMovingChange={setPlayerMoving} jumpTick={jumpTick} />
        <InteractionRaycast onTarget={onTarget} />
        <PointerLockControls
          selector="#enter-world"
          onLock={() => setLocked(true)}
          onUnlock={() => {
            setLocked(false);
            setArmSwingHeld(false);
            setPlayerMoving(false);
            setTarget(null);
            setTargetLabel(null);
            setHoveredInventoryMaterial(null);
          }}
        />
      </Canvas>

      <div className="hud">
        {!locked ? (
          <section className="status-card" data-ui-layer="true" aria-label="World controls">
            <p className="eyebrow">Voxel portfolio prototype</p>
            <h1 className="title">Portfolio Craft</h1>
            <p className="subtitle">
              Explore a handcrafted block world, aim at a landmark, and click to open the matching section.
            </p>
            <button
              id="enter-world"
              type="button"
              className="enter-world"
              disabled={locked || Boolean(activePanel)}
              aria-describedby="world-controls"
            >
              {locked ? "Exploring" : activePanel ? "Close Panel To Re-enter" : "Enter World"}
            </button>
            <p id="world-controls" className="locked-hint">
              {locked ? "WASD to move, Space to jump. Left click to mine and right click to place the selected block. Press ESC to free the cursor." : "Cursor unlocked. Enter the world to explore the interactive blocks."}
            </p>
          </section>
        ) : null}

        <div className="crosshair" aria-hidden="true" />

        {targetLabel && locked ? <div className="tooltip">{targetLabel}</div> : null}

        <section className="collected-inventory" aria-label="Collected block inventory" data-ui-layer="true">
          <p className="collected-inventory-title">Collected</p>
          <div className="collected-inventory-grid">
            {Array.from({ length: hotbarSlotCount }, (_, index) => {
              const material = visibleInventoryMaterials[index] ?? null;

              return (
              <div
                key={material ?? `empty-slot-${index}`}
                className={`collected-slot${selectedInventorySlot === index ? " selected" : ""}`}
                aria-selected={selectedInventorySlot === index}
                onClick={() => {
                  setSelectedInventorySlot(index);
                  setHoveredInventoryMaterial(material);
                }}
                onMouseEnter={() => {
                  if (material) setHoveredInventoryMaterial(material);
                }}
                onMouseLeave={() => {
                  setHoveredInventoryMaterial((current) => (current === material ? null : current));
                }}
              >
                {material ? (
                  <>
                    <InventoryVoxelIcon material={material} />
                    <span className="collected-slot-count">{collectedInventory[material]}</span>
                  </>
                ) : (
                  <span className="collected-slot-empty" aria-hidden="true" />
                )}
              </div>
              );
            })}
          </div>
        </section>

        {!locked ? (
          <div className="quick-links" data-ui-layer="true">
            <a href="#fallback">Skip 3D / Open standard site</a>
            <a href="mailto:hello@example.com">Contact</a>
          </div>
        ) : null}
      </div>

      {content ? (
        <aside className="panel" role="dialog" aria-label={content.title} data-ui-layer="true">
          <p className="panel-strapline">{content.strapline}</p>
          <h2>{content.title}</h2>
          <p>{content.body}</p>
          <div className="panel-actions">
            {content.cta ? (
              <a className="cta" href={content.cta.href}>
                {content.cta.label}
              </a>
            ) : null}
            <button type="button" onClick={() => setActivePanel(null)}>
              Close
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
