import * as THREE from "three";
import type { WorldMaterial } from "@/data/world";
import type { CenterTerrainHit } from "../types";
import { isTerrainRayHitSuppressed } from "./occupancy";
import type { TerrainOccupancySnapshot } from "./occupancy";

type FixtureHitUserData = {
  terrainMaterial: Exclude<WorldMaterial, "cloud">;
  fixturePrimaryId?: string;
  fixtureBreakPosition?: [number, number, number];
};

function readFixtureHitUserData(object: THREE.Object3D): FixtureHitUserData | null {
  let o: THREE.Object3D | null = object;
  while (o) {
    const m = o.userData?.terrainMaterial as WorldMaterial | undefined;
    if (m && m !== "cloud") {
      return {
        terrainMaterial: m,
        fixturePrimaryId: o.userData.fixturePrimaryId as string | undefined,
        fixtureBreakPosition: o.userData.fixtureBreakPosition as [number, number, number] | undefined,
      };
    }
    o = o.parent;
  }
  return null;
}

export function getCenterTerrainHit(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  scene: THREE.Scene,
  maxDistance: number,
  occupancy: TerrainOccupancySnapshot,
): CenterTerrainHit | null {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (const hit of intersects) {
    if (hit.distance > maxDistance) break;

    if (hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
      const terrainMaterial = hit.object.userData?.terrainMaterial as WorldMaterial | undefined;
      if (!terrainMaterial || terrainMaterial === "cloud") continue;

      const normal = (hit.face?.normal ?? new THREE.Vector3(0, 1, 0)).clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();

      const blockPosition = new THREE.Vector3();
      const instanceMatrix = new THREE.Matrix4();
      hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
      blockPosition.setFromMatrixPosition(instanceMatrix);
      hit.object.localToWorld(blockPosition);

      const blockKey = `${blockPosition.x}:${blockPosition.y}:${blockPosition.z}`;
      if (isTerrainRayHitSuppressed(occupancy, blockKey)) continue;

      return {
        terrainMaterial,
        point: hit.point.clone(),
        normal,
        blockPosition: [blockPosition.x, blockPosition.y, blockPosition.z] as [number, number, number],
        blockKey,
      } satisfies CenterTerrainHit;
    }

    const ud = readFixtureHitUserData(hit.object);
    if (!ud) continue;

    const normal = (hit.face?.normal ?? new THREE.Vector3(0, 1, 0)).clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();

    const blockPositionVec = new THREE.Vector3();
    blockPositionVec.copy(hit.object.getWorldPosition(blockPositionVec));
    const fallback: [number, number, number] = [blockPositionVec.x, blockPositionVec.y, blockPositionVec.z];
    const blockPosition = ud.fixtureBreakPosition ?? fallback;
    const blockKey = ud.fixturePrimaryId ?? `${blockPosition[0]}:${blockPosition[1]}:${blockPosition[2]}`;

    if (isTerrainRayHitSuppressed(occupancy, blockKey)) continue;

    return {
      terrainMaterial: ud.terrainMaterial,
      point: hit.point.clone(),
      normal,
      blockPosition,
      blockKey,
    } satisfies CenterTerrainHit;
  }

  return null;
}
