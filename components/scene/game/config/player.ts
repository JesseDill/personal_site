/** Walk speed multiplier when holding Shift while moving forward (W). */
export const playerSprintMultiplier = 1.3;

/** Sneak (Ctrl): forward/strafe speed vs base walk speed. */
export const playerSneakSpeedMultiplier = 0.3;
/** Sneak diagonal (W/S + A/D): combined axis multiplier. */
export const playerSneakDiagonalSpeedMultiplier = 0.424;
/** Sneak: eye and body height scale (camera and capsule). */
export const playerSneakHeightFactor = 0.8333;

export const playerCollisionConfig = {
  radius: 0.34,
  height: 1.8,
  eyeHeight: 1.6,
  boundaryPadding: 0.5,
  stepHeight: 0.65,
  groundSnapDistance: 0.18,
} as const;

export const playerSpawnPosition: [number, number, number] = [0, playerCollisionConfig.eyeHeight + 2, 2.5];
export const playerSpawnRotation: [number, number, number] = [-Math.PI/64, Math.PI, 0];

/** Reserved for future landmark pads; empty while landmark meshes are removed from the scene. */
export const blockedLandmarkCells = new Set<string>();
