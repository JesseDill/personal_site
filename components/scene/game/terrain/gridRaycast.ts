import * as THREE from "three";
import type { WorldBlock } from "@/data/world";

/** Amanatides–Woo traversal on integer X/Z centers and half-integer Y centers. */
export function raycastVoxelGrid(ray: THREE.Ray, maxDistance: number, getBlock: (key: string) => WorldBlock | undefined) {
  if (!Number.isFinite(maxDistance) || maxDistance < 0) return null;
  const origin = [ray.origin.x + .5, ray.origin.y, ray.origin.z + .5];
  const direction = [ray.direction.x, ray.direction.y, ray.direction.z];
  const cell = origin.map(Math.floor);
  const step = direction.map(Math.sign);
  const delta = direction.map(v => v === 0 ? Infinity : Math.abs(1 / v));
  const next = direction.map((v, i) => v === 0 ? Infinity : ((v > 0 ? cell[i] + 1 : cell[i]) - origin[i]) / v);
  // Starting exactly on an entering face is a valid zero-distance FrontSide hit.
  const enteringAxis = origin.findIndex((v, i) => v === cell[i] && direction[i] > 0);
  if (enteringAxis !== -1) {
    const key = `${cell[0]}:${cell[1] + .5}:${cell[2]}`;
    const block = getBlock(key);
    if (block && block.material !== "cloud") {
      const normal = new THREE.Vector3().setComponent(enteringAxis, -1);
      return { block, blockKey:key, distance:0, normal, point:ray.origin.clone() };
    }
  }
  // Match FrontSide cubes: an origin inside a cube does not hit its exit face.
  let distance = 0;
  for (let iteration = 0; iteration < Math.ceil(maxDistance * 3) + 6; iteration++) {
    const axis = next[0] <= next[1] && next[0] <= next[2] ? 0 : next[1] <= next[2] ? 1 : 2;
    distance = next[axis];
    if (!Number.isFinite(distance) || distance > maxDistance) return null;
    cell[axis] += step[axis]; next[axis] += delta[axis];
    const key = `${cell[0]}:${cell[1] + .5}:${cell[2]}`;
    const block = getBlock(key);
    if (!block || block.material === "cloud") continue;
    const normal = new THREE.Vector3(); normal.setComponent(axis, -step[axis]);
    return { block, blockKey: key, distance, normal, point: ray.at(distance, new THREE.Vector3()) };
  }
  return null;
}
