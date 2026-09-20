import type { WaterCell } from "../types";
import { tickWater } from "./waterSimulation";

export function waterMapsEqual(a: ReadonlyMap<string, WaterCell>, b: ReadonlyMap<string, WaterCell>) {
  if (a.size !== b.size) return false;
  for (const [key, cell] of b) {
    const prev = a.get(key);
    if (!prev || prev.level !== cell.level || prev.isSource !== cell.isSource) return false;
  }
  return true;
}
/** Sleep only at a proven fixed point. Any occupancy/input change wakes the solver. */
export function createWaterStepper() {
  let revision: unknown;
  let settled: ReadonlyMap<string, WaterCell> | undefined;
  return (prev: Map<string, WaterCell>, occupancyRevision: unknown, isSolid: (x:number,y:number,z:number) => boolean) => {
    if (revision === occupancyRevision && settled === prev) return prev;
    revision = occupancyRevision;
    const next = tickWater(prev, isSolid);
    if (waterMapsEqual(prev, next)) { settled = prev; return prev; }
    settled = undefined; return next;
  };
}
