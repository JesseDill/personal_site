"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import { terrainImpactConfig, terrainImpactMaterials } from "../config/particles";
import type { MaterialDefinition } from "../materials/types";
import { cubeFaceOrder } from "../materials/types";
import { faceTexturePaths, voxelMaterialPalette } from "../materials/voxelMaterialPalette";
import { useVoxelTextures } from "../materials/useVoxelTextures";
import { getCenterTerrainHit } from "../terrain/raycastTerrain";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";

export function TerrainImpactParticles({
  trigger,
  enabled,
  getOccupancySnapshot,
}: {
  trigger: number;
  enabled: boolean;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const { camera, scene } = useThree();
  const texturesByPath = useVoxelTextures();
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

    const terrainHit = getCenterTerrainHit(
      raycaster,
      camera,
      scene,
      terrainImpactConfig.maxDistance,
      getOccupancySnapshot(),
    );

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
  }, [camera, enabled, getOccupancySnapshot, raycaster, scene, syncPoolMesh, trigger]);

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
      {terrainImpactMaterials.map((material) => {
        const materialDefinition: MaterialDefinition = voxelMaterialPalette[material];

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
      })}
    </>
  );
}
