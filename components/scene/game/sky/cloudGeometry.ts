import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function createCloudBasePositions(
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
        (normalizedX - 0.5) * spreadX + Math.sin(index * 1.73 + attempt * 0.91 + layerIndex) * spreadX * 0.08;
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

export function createCloudVoxelGeometry(
  width: number,
  height: number,
  depth: number,
  blockSize: number,
  puffCount: number,
  seed: number,
) {
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
