"use client";

import { PointerLockControls, useTexture } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { interactionContent, type InteractionId } from "@/data/interactions";
import {
  landmarks,
  obstacleCells,
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
    side: "/textures/player/arm-skin-side.svg",
    top: "/textures/player/arm-skin-top.svg",
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

function configurePixelTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

const groupedWorldBlocks = groupBlocksByMaterial(worldBlocks);

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
  positions,
  material,
  faceTextures,
  castShadow = true,
}: {
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
  }, [dummy, positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow={castShadow} receiveShadow>
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

function VoxelWorld() {
  const texturesByPath = useWorldTextures();
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
      {(Object.keys(groupedWorldBlocks) as WorldMaterial[]).map((material) => (
        <InstancedVoxelBlocks
          key={material}
          positions={groupedWorldBlocks[material]}
          material={materialPalette[material]}
          faceTextures={faceTexturesByMaterial[material]}
          castShadow={material !== "cloud"}
        />
      ))}
    </>
  );
}

function PlayerArmViewmodel({
  moving,
  swingTick,
}: {
  moving: boolean;
  swingTick: number;
}) {
  const armRef = useRef<THREE.Group>(null);
  const bobPhaseRef = useRef(0);
  const bobBlendRef = useRef(0);
  const swingProgressRef = useRef(1);
  const armTextures = useArmTextures();

  useEffect(() => {
    swingProgressRef.current = 0;
  }, [swingTick]);

  useFrame((_state, delta) => {
    if (!armRef.current) return;

    bobBlendRef.current = THREE.MathUtils.damp(bobBlendRef.current, moving ? 1 : 0, 8, delta);
    bobPhaseRef.current += delta * THREE.MathUtils.lerp(1.3, 10.5, bobBlendRef.current);
    swingProgressRef.current = Math.min(1, swingProgressRef.current + delta / 0.12);

    const bobX = Math.sin(bobPhaseRef.current) * 0.05 * bobBlendRef.current;
    const bobY = Math.abs(Math.cos(bobPhaseRef.current * 0.9)) * 0.06 * bobBlendRef.current;
    const swingProgress = swingProgressRef.current;
    const strikePhase = 0.34;
    const swing =
      swingProgress < strikePhase
        ? THREE.MathUtils.smootherstep(swingProgress / strikePhase, 0, 1)
        : 1 - THREE.MathUtils.smoothstep((swingProgress - strikePhase) / (1 - strikePhase), 0, 1) * 0.92;

    armRef.current.position.set(0.88 + bobX + swing * 0.1, -0.96 + bobY - swing * 0.12, 0);
    armRef.current.rotation.set(
      -0.45 - bobY * 0.25 + swing * 0.66,
      0.22 - bobX * 0.18 + swing * 0.24,
      -0.22 + bobX * 0.7 + swing * 0.9,
    );
  });

  return (
    <>
      <ambientLight intensity={1} />
      <group ref={armRef} position={[0.88, -0.96, 0]} rotation={[-0.45, 0.22, -0.22]} scale={1.45}>
        <group renderOrder={2000}>
          <mesh frustumCulled={false} renderOrder={2000} position={[0.02, -0.22, 0]}>
            <boxGeometry args={[0.29, 0.94, 0.29]} />
            {armTextures.skin.map((texture, index) => (
              <meshBasicMaterial
                key={`skin-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            ))}
          </mesh>
          <mesh frustumCulled={false} renderOrder={2001} position={[0.02, 0.16, 0]}>
            <boxGeometry args={[0.31, 0.26, 0.31]} />
            {armTextures.sleeve.map((texture, index) => (
              <meshBasicMaterial
                key={`sleeve-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            ))}
          </mesh>
          <mesh frustumCulled={false} renderOrder={2002} position={[0.02, 0.29, 0]}>
            <boxGeometry args={[0.33, 0.08, 0.33]} />
            {armTextures.cuff.map((texture, index) => (
              <meshBasicMaterial
                key={`cuff-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            ))}
          </mesh>
        </group>
      </group>
    </>
  );
}

function PlayerController({
  enabled,
  onMovingChange,
}: {
  enabled: boolean;
  onMovingChange: (moving: boolean) => void;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const movingRef = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.6, 5.5);
  }, [camera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
    if (enabled || !movingRef.current) return;
    movingRef.current = false;
    onMovingChange(false);
  }, [enabled, onMovingChange]);

  useFrame((_state, delta) => {
    if (!enabled) return;
    const speed = 4.25;
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

    if (!wantsToMove) return;
    movement.normalize().multiplyScalar(speed * delta);

    const candidate = camera.position.clone().add(movement);
    const cellX = Math.round(candidate.x);
    const cellZ = Math.round(candidate.z);
    const blocked = obstacleCells.has(`${cellX}:${cellZ}`);

    const insideBounds =
      candidate.x > worldBounds.minX + 1 &&
      candidate.x < worldBounds.maxX - 1 &&
      candidate.z > worldBounds.minZ + 1 &&
      candidate.z < worldBounds.maxZ - 1;

    if (!blocked && insideBounds) {
      camera.position.set(candidate.x, 1.6, candidate.z);
    }
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
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  const onTarget = useCallback((id: InteractionId | null, label: string | null) => {
    setTarget(id);
    setTargetLabel(label);
  }, []);

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
      setArmSwingTick((current) => current + 1);
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [locked]);

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
        <VoxelWorld />
        {landmarks.map((landmark) => (
          <InteractableLandmark key={landmark.id} id={landmark.id} isActive={target === landmark.id} />
        ))}

        <PlayerController enabled={locked} onMovingChange={setPlayerMoving} />
        <InteractionRaycast onTarget={onTarget} />
        <PointerLockControls
          selector="#enter-world"
          onLock={() => setLocked(true)}
          onUnlock={() => {
            setLocked(false);
            setPlayerMoving(false);
            setTarget(null);
            setTargetLabel(null);
          }}
        />
      </Canvas>

      {locked && !activePanel ? (
        <Canvas
          camera={{ fov: 48, position: [0, 0, 3.2] }}
          gl={{ alpha: true, premultipliedAlpha: false, antialias: false }}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, background: "transparent" }}
          onCreated={({ gl, scene }) => {
            gl.autoClear = true;
            gl.setClearColor(0x000000, 0);
            scene.background = null;
          }}
        >
          <PlayerArmViewmodel moving={playerMoving} swingTick={armSwingTick} />
        </Canvas>
      ) : null}

      <div className="hud">
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
            {locked ? "WASD to move. Click a glowing block to inspect it. Press ESC to free the cursor." : "Cursor unlocked. Use the quick bar or the classic layout if you want the fast path."}
          </p>
        </section>

        <div className="crosshair" aria-hidden="true" />

        {targetLabel && locked ? <div className="tooltip">{targetLabel}</div> : null}

        <div className="quick-links" data-ui-layer="true">
          <a href="#fallback">Skip 3D / Open standard site</a>
          <a href="mailto:hello@example.com">Contact</a>
        </div>

        <nav className="inventory" aria-label="Quick open portfolio sections" data-ui-layer="true">
          {landmarks.map((landmark) => (
            <button
              key={landmark.id}
              type="button"
              className={`inventory-slot${activePanel === landmark.id ? " active" : ""}`}
              style={{ "--slot-color": materialPalette[landmark.accent].uiColor } as CSSProperties}
              onClick={() => setActivePanel(landmark.id)}
            >
              <span className="slot-label">{landmark.subtitle}</span>
              <span className="slot-title">{interactionContent[landmark.id].title}</span>
            </button>
          ))}
        </nav>
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
