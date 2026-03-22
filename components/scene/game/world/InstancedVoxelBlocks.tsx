"use client";

import type { WorldMaterial } from "@/data/world";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MaterialDefinition } from "../materials/types";

type InstancedVoxelBlocksProps = {
  materialId: WorldMaterial;
  positions: [number, number, number][];
  material: MaterialDefinition;
  faceTextures: THREE.Texture[];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export function InstancedVoxelBlocks({
  materialId,
  positions,
  material,
  faceTextures,
  castShadow = true,
  receiveShadow = true,
}: InstancedVoxelBlocksProps) {
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
      receiveShadow={receiveShadow}
      frustumCulled={false}
      userData={{
        terrainMaterial: materialId,
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      {faceTextures.map((texture, index) =>
        material.unlit ? (
          <meshBasicMaterial
            key={`${index}-${texture.uuid}`}
            attach={`material-${index}`}
            map={texture}
            color={material.solidColor ?? "#ffffff"}
            transparent={material.transparent}
            alphaTest={material.alphaTest ?? 0}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            key={`${index}-${texture.uuid}`}
            attach={`material-${index}`}
            map={texture}
            color={material.solidColor ?? "#ffffff"}
            roughness={material.roughness ?? 1}
            metalness={material.metalness ?? 0}
            emissive={material.emissive}
            emissiveIntensity={material.emissiveIntensity}
            transparent={material.transparent}
            alphaTest={material.alphaTest ?? 0}
          />
        ),
      )}
    </instancedMesh>
  );
}
