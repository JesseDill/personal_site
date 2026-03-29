/** Tuning for starvation-based health loss (10 hearts = 20 half-units). */
export const healthConfig = {
  /** Maximum health in half-heart units (10 full hearts). */
  maxHealth: 20,
  /** Milliseconds between each 1-point health loss while starving (hunger === 0). */
  starvationDamageIntervalMs: 4000,
  /** Health will never drop below this value from starvation damage. */
  starvationMinHealth: 1,
  /** At or below this health, all hearts wobble continuously. */
  criticalHealthThreshold: 1,
  /** Duration (ms) of the screen-shake effect when a health point is lost. */
  screenShakeDurationMs: 350,
} as const;
