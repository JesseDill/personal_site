import * as THREE from "three";
import { worldBlocks, type WorldMaterial } from "@/data/world";
import type { CenterTerrainHit, FixtureKind } from "../types";
import { isTerrainRayHitSuppressed, type TerrainOccupancySnapshot } from "./occupancy";
import { raycastVoxelGrid } from "./gridRaycast";
import { fixtureData, getPickRegistry } from "../interaction/pickRegistry";
import { timed, countWork } from "../performance/metrics";

const baseBlocks = new Map(worldBlocks.map(block => [block.position.join(":"), block]));
const center = new THREE.Vector2();
type Cache = { signature: string; occupancy: TerrainOccupancySnapshot; hit: CenterTerrainHit | null };
const caches = new WeakMap<THREE.Scene, Cache>();

/** Cache only identical rays, occupancy and fixture transforms; clicks after edits stay fresh. */
export function getCenterTerrainHit(raycaster: THREE.Raycaster, camera: THREE.Camera, scene: THREE.Scene,
  maxDistance: number, occupancy: TerrainOccupancySnapshot): CenterTerrainHit | null {
  return timed("picking.terrain", () => {
    camera.updateWorldMatrix(true, false);
    raycaster.setFromCamera(center, camera); raycaster.far = maxDistance;
    const registry = getPickRegistry(scene);
    const targets = registry.targets("fixture");
    const parts: (string | number)[] = [maxDistance, registry.version, ...raycaster.ray.origin.toArray(), ...raycaster.ray.direction.toArray()];
    for (const target of targets) {
      target.updateWorldMatrix(true, false);
      // Metadata may change without a scene add/remove (e.g. replacement fixture).
      parts.push(target.id, ...target.matrixWorld.elements, JSON.stringify(fixtureData(target)));
    }
    const signature = parts.join(",");
    const cached = caches.get(scene);
    if (cached?.signature === signature && cached.occupancy === occupancy) { countWork("terrainPickCacheHits"); return cached.hit; }
    const voxel = raycastVoxelGrid(raycaster.ray, maxDistance, key => occupancy.placedBlocksByKey.get(key) ??
      (occupancy.removedKeys.has(key) ? undefined : baseBlocks.get(key)));
    countWork("terrainPickQueries"); countWork("pickCandidates", targets.length);
    const fixtures = raycaster.intersectObjects(targets, false);
    let result: CenterTerrainHit | null = voxel ? {
      terrainMaterial: voxel.block.material as Exclude<WorldMaterial,"cloud">,
      point: voxel.point, normal: voxel.normal, blockPosition: voxel.block.position, blockKey: voxel.blockKey,
    } : null;
    for (const hit of fixtures) {
      if (voxel && hit.distance > voxel.distance) break;
      const data = fixtureData(hit.object);
      if (!data) continue;
      const blockPosition = (data.fixtureBreakPosition ?? hit.object.getWorldPosition(new THREE.Vector3()).toArray()) as [number,number,number];
      const blockKey = data.fixturePrimaryId ?? blockPosition.join(":");
      if (isTerrainRayHitSuppressed(occupancy, blockKey)) continue;
      const normal = (hit.face?.normal ?? new THREE.Vector3(0,1,0)).clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      result = { terrainMaterial:data.terrainMaterial, point:hit.point.clone(), normal, blockPosition, blockKey };
      break;
    }
    caches.set(scene, { signature, occupancy, hit:result });
    return result;
  });
}

/** Preserve existing behavior: first door within reach, ignoring unrelated geometry. */
export function getDoorTogglePrimaryId(raycaster: THREE.Raycaster, camera: THREE.Camera, scene: THREE.Scene,
  maxDistance: number, occupancy: TerrainOccupancySnapshot): string | null {
  camera.updateWorldMatrix(true, false);
  raycaster.setFromCamera(center, camera); raycaster.far = maxDistance;
  const targets = getPickRegistry(scene).targets("door");
  for (const target of targets) target.updateWorldMatrix(true, false);
  for (const hit of raycaster.intersectObjects(targets, false)) {
    const data = fixtureData(hit.object);
    if (data?.fixturePrimaryId && (data.fixtureKind as FixtureKind) === "door" && !isTerrainRayHitSuppressed(occupancy, data.fixturePrimaryId)) return data.fixturePrimaryId;
  }
  return null;
}
