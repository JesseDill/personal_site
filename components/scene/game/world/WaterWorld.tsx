"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { WaterCell } from "../types";
import { MAX_WATER_LEVEL } from "../water/waterSimulation";

const WATER_COLOR = "#2d6eb5";
const WATER_OPACITY = 0.55;
const INSET = 0.01;
const MAX_WATER_INSTANCES = 512;

export function WaterWorld({ cells }: { cells: ReadonlyMap<string, WaterCell> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1 - INSET * 2, 1, 1 - INSET * 2), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WATER_COLOR,
        transparent: true,
        opacity: WATER_OPACITY,
        roughness: 0.25,
        metalness: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const cellArray = useMemo(() => Array.from(cells.values()), [cells]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    const count = Math.min(cellArray.length, MAX_WATER_INSTANCES);
    for (let i = 0; i < count; i += 1) {
      const cell = cellArray[i];
      const height = cell.level / MAX_WATER_LEVEL;
      const bottomY = cell.y - 0.5;
      pos.set(cell.x, bottomY + height / 2, cell.z);
      scl.set(1, height, 1);
      mat.compose(pos, quat, scl);
      mesh.setMatrixAt(i, mat);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cellArray]);

  if (cellArray.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_WATER_INSTANCES]}
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
