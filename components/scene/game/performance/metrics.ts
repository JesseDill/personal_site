/** Opt-in timings: no performance.now calls in normal gameplay. */
export const metrics = {
  enabled: false,
  samples: new Map<string, number[]>(),
  counts: new Map<string, number>(),
};
export function countWork(name: string, amount = 1) {
  if (metrics.enabled) metrics.counts.set(name, (metrics.counts.get(name) ?? 0) + amount);
}
export function timed<T>(name: string, work: () => T): T {
  if (!metrics.enabled) return work();
  const start = performance.now();
  try { return work(); } finally {
    const samples = metrics.samples.get(name) ?? [];
    if (samples.length >= 600) samples.shift();
    samples.push(performance.now() - start);
    metrics.samples.set(name, samples);
  }
}
export function percentile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}
