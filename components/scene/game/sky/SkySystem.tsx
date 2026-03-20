"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { worldSky } from "@/data/world";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import { createCloudBasePositions, createCloudVoxelGeometry } from "./cloudGeometry";
import { applyLerpedColor, orbitSkyBody, wrapIntoRange } from "./orbit";

const uniqueSkyTexturePaths = Array.from(new Set([worldSky.sun.texture, worldSky.moon.texture]));

type SkySystemProps = {
  ambientLightRef: { current: THREE.AmbientLight | null };
  hemisphereLightRef: { current: THREE.HemisphereLight | null };
  directionalLightRef: { current: THREE.DirectionalLight | null };
};

export function SkySystem({ ambientLightRef, hemisphereLightRef, directionalLightRef }: SkySystemProps) {
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
      Object.fromEntries(uniqueSkyTexturePaths.map((path, index) => [path, skyTextures[index]])) as Record<
        string,
        THREE.Texture
      >,
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
            geometry: createCloudVoxelGeometry(
              width,
              cloudHeight,
              depth,
              layer.blockSize,
              layer.puffCount,
              index + layerIndex * 17,
            ),
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
          <meshBasicMaterial
            ref={domeMaterialRef}
            color={worldSky.colors.dayDome}
            side={THREE.BackSide}
            fog={false}
            depthWrite={false}
          />
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
