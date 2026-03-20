import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import type { CenterTerrainHit } from "../types";
import { isTerrainRayHitSuppressed } from "./occupancy";
import type { TerrainOccupancySnapshot } from "./occupancy";

export function getCenterTerrainHit(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  scene: THREE.Scene,
  maxDistance: number,
  occupancy: TerrainOccupancySnapshot,
): CenterTerrainHit | null {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster
    .intersectObjects(scene.children, true)
    .find(
      (entry) => (entry.object.userData?.terrainMaterial as WorldMaterial | undefined) && entry.distance <= maxDistance,
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

  if (isTerrainRayHitSuppressed(occupancy, blockKey)) {
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
