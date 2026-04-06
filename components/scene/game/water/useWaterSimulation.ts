import { useCallback, useEffect, useRef, useState } from "react";
import { worldWaterSources } from "@/data/world";
import type { WaterCell } from "../types";
import { isTerrainBlockKeyOccupied, type TerrainOccupancySnapshot } from "../terrain/occupancy";
import {
  initWaterCells,
  isPointInWater,
  tickWater,
  WATER_TICK_INTERVAL_MS,
} from "./waterSimulation";

function buildIsCellSolid(snapshot: TerrainOccupancySnapshot) {
  return (x: number, y: number, z: number) =>
    isTerrainBlockKeyOccupied(snapshot, `${Math.round(x)}:${y}:${Math.round(z)}`);
}

function waterMapsEqual(a: ReadonlyMap<string, WaterCell>, b: Map<string, WaterCell>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, cell] of b) {
    const prev = (a as Map<string, WaterCell>).get(key);
    if (!prev || prev.level !== cell.level || prev.isSource !== cell.isSource) return false;
  }
  return true;
}

export function useWaterSimulation(
  getOccupancySnapshot: () => TerrainOccupancySnapshot,
) {
  const [waterCells, setWaterCells] = useState<Map<string, WaterCell>>(() =>
    initWaterCells(worldWaterSources),
  );

  const cellsRef = useRef(waterCells);
  cellsRef.current = waterCells;

  useEffect(() => {
    const id = setInterval(() => {
      const snapshot = getOccupancySnapshot();
      const isSolid = buildIsCellSolid(snapshot);

      setWaterCells((prev) => {
        const next = tickWater(prev, isSolid);
        return waterMapsEqual(prev, next) ? prev : next;
      });
    }, WATER_TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [getOccupancySnapshot]);

  const isInWater = useCallback(
    (x: number, y: number, z: number) => isPointInWater(cellsRef.current, x, y, z),
    [],
  );

  return { waterCells, isInWater };
}
