import { worldBounds } from "@/data/world";
import { blockedLandmarkCells, playerCollisionConfig } from "../config/player";
import {
  getMergedSolidSegmentsForCell,
  isSolidSegmentIgnoredForSupport,
  type TerrainOccupancySnapshot,
} from "../terrain/occupancy";
import { worldSolidColumns } from "../terrain/worldTerrainIndex";
import { blockIntersectsPlayerCapsule, getOccupiedCellRange, overlapsPlayerCellFootprint } from "./collisionMath";

export function getHighestSupportBelowFeet(
  snapshot: TerrainOccupancySnapshot,
  x: number,
  feetY: number,
  z: number,
) {
  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let highestSupport = Number.NEGATIVE_INFINITY;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsPlayerCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getMergedSolidSegmentsForCell(snapshot, worldSolidColumns, cellX, cellZ);
      if (!column.length) continue;

      column.forEach((segment) => {
        if (isSolidSegmentIgnoredForSupport(snapshot, segment)) return;
        if (segment.top <= feetY + 0.001) {
          highestSupport = Math.max(highestSupport, segment.top);
        }
      });
    }
  }

  return highestSupport === Number.NEGATIVE_INFINITY ? 0 : highestSupport;
}

export function canPlayerOccupyFeetPosition(snapshot: TerrainOccupancySnapshot, x: number, feetY: number, z: number) {
  const inset = playerCollisionConfig.boundaryPadding + playerCollisionConfig.radius;
  const insideBounds =
    x > worldBounds.minX + inset &&
    x < worldBounds.maxX - inset &&
    z > worldBounds.minZ + inset &&
    z < worldBounds.maxZ - inset;

  if (!insideBounds) {
    return false;
  }

  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  const bodyBottom = feetY + 0.001;
  const bodyTop = feetY + playerCollisionConfig.height - 0.001;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsPlayerCellFootprint(x, z, cellX, cellZ)) continue;

      if (blockedLandmarkCells.has(`${cellX}:${cellZ}`)) {
        return false;
      }

      const column = getMergedSolidSegmentsForCell(snapshot, worldSolidColumns, cellX, cellZ);
      if (!column.length) continue;

      if (
        column.some(
          (segment) =>
            !isSolidSegmentIgnoredForSupport(snapshot, segment) &&
            segment.top > bodyBottom &&
            segment.bottom < bodyTop,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

export function findStepUpFeetHeight(snapshot: TerrainOccupancySnapshot, x: number, currentFeetY: number, z: number) {
  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let bestStepHeight: number | null = null;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsPlayerCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getMergedSolidSegmentsForCell(snapshot, worldSolidColumns, cellX, cellZ);
      if (!column.length) continue;

      column.forEach((segment) => {
        if (isSolidSegmentIgnoredForSupport(snapshot, segment)) return;
        const stepHeight = segment.top - currentFeetY;
        if (stepHeight <= 0.001 || stepHeight > playerCollisionConfig.stepHeight) {
          return;
        }

        if (canPlayerOccupyFeetPosition(snapshot, x, segment.top, z)) {
          bestStepHeight = bestStepHeight === null ? segment.top : Math.max(bestStepHeight, segment.top);
        }
      });
    }
  }

  return bestStepHeight;
}

export function resolveUpwardFeetPositionWithCeiling(
  snapshot: TerrainOccupancySnapshot,
  x: number,
  currentFeetY: number,
  targetFeetY: number,
  z: number,
) {
  if (canPlayerOccupyFeetPosition(snapshot, x, targetFeetY, z)) {
    return targetFeetY;
  }

  const xRange = getOccupiedCellRange(x, playerCollisionConfig.radius);
  const zRange = getOccupiedCellRange(z, playerCollisionConfig.radius);
  let lowestCeiling = Number.POSITIVE_INFINITY;

  for (let cellX = xRange.min; cellX <= xRange.max; cellX += 1) {
    for (let cellZ = zRange.min; cellZ <= zRange.max; cellZ += 1) {
      if (!overlapsPlayerCellFootprint(x, z, cellX, cellZ)) continue;

      const column = getMergedSolidSegmentsForCell(snapshot, worldSolidColumns, cellX, cellZ);
      if (!column.length) continue;

      column.forEach((segment) => {
        if (isSolidSegmentIgnoredForSupport(snapshot, segment)) return;
        if (
          segment.bottom >= currentFeetY + playerCollisionConfig.height - 0.001 &&
          segment.bottom < targetFeetY + playerCollisionConfig.height
        ) {
          lowestCeiling = Math.min(lowestCeiling, segment.bottom);
        }
      });
    }
  }

  if (lowestCeiling !== Number.POSITIVE_INFINITY) {
    return Math.max(currentFeetY, lowestCeiling - playerCollisionConfig.height);
  }

  return currentFeetY;
}

export { blockIntersectsPlayerCapsule };
