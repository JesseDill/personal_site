import { landmarks } from "@/data/world";

export const playerCollisionConfig = {
  radius: 0.34,
  height: 1.8,
  eyeHeight: 1.6,
  boundaryPadding: 0.5,
  stepHeight: 0.65,
  groundSnapDistance: 0.18,
} as const;

export const playerSpawnPosition: [number, number, number] = [0, playerCollisionConfig.eyeHeight + 1, 2.5];
export const playerSpawnRotation: [number, number, number] = [0, Math.PI, 0];

/** Cells where landmark pads sit — player cannot stand here. */
export const blockedLandmarkCells = new Set(
  landmarks.map((landmark) => `${Math.round(landmark.position[0])}:${Math.round(landmark.position[2])}`),
);
