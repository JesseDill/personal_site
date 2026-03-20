import type * as THREE from "three";
import { playerCollisionConfig } from "../config/player";

export function getOccupiedCellRange(center: number, radius: number) {
  return {
    min: Math.ceil(center - radius - 0.5),
    max: Math.floor(center + radius + 0.5),
  };
}

export function overlapsPlayerCellFootprint(x: number, z: number, cellX: number, cellZ: number) {
  return (
    x + playerCollisionConfig.radius > cellX - 0.5 &&
    x - playerCollisionConfig.radius < cellX + 0.5 &&
    z + playerCollisionConfig.radius > cellZ - 0.5 &&
    z - playerCollisionConfig.radius < cellZ + 0.5
  );
}

export function blockIntersectsPlayerCapsule(
  position: [number, number, number],
  cameraPosition: THREE.Vector3,
) {
  const playerFeetY = cameraPosition.y - playerCollisionConfig.eyeHeight;
  const bodyBottom = playerFeetY + 0.001;
  const bodyTop = playerFeetY + playerCollisionConfig.height - 0.001;
  const blockBottom = position[1] - 0.5;
  const blockTop = position[1] + 0.5;

  return (
    overlapsPlayerCellFootprint(cameraPosition.x, cameraPosition.z, Math.round(position[0]), Math.round(position[2])) &&
    blockTop > bodyBottom &&
    blockBottom < bodyTop
  );
}
