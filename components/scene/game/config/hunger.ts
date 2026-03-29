/** Tuning for walking-based hunger depletion (10 drumsticks = 20 half-units). */
export const hungerConfig = {
  /** Saturation gained per block of horizontal distance walked. */
  saturationPerBlock: 0.1,
  /** When saturation reaches this value, one hunger point is lost and saturation resets to 0. */
  saturationThreshold: 4.0,
  /** Wobble on the leading hunger icon only at or above this saturation while walking. */
  wobbleMinSaturation: 2.0,
  /** Hunger half-points lost each time saturation hits the threshold. */
  hungerPointsLostPerTrigger: 1,
  /** Max hunger in half-drumstick units (10 full icons). */
  maxHunger: 20,
} as const;
