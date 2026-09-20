import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWaterStepper } from "./waterStepper";
import { timed } from "../performance/metrics";
import { worldWaterSources } from "@/data/world";
import type { WaterCell } from "../types";
import { isTerrainBlockKeyOccupied, type TerrainOccupancySnapshot } from "../terrain/occupancy";
import {
  initWaterCells,
  isPointInWater,
  WATER_TICK_INTERVAL_MS,
} from "./waterSimulation";

function buildIsCellSolid(snapshot: TerrainOccupancySnapshot) {
  return (x: number, y: number, z: number) =>
    isTerrainBlockKeyOccupied(snapshot, `${Math.round(x)}:${y}:${Math.round(z)}`);
}

export function useWaterSimulation(
  getOccupancySnapshot: () => TerrainOccupancySnapshot,
) {
  const [waterCells, setWaterCells] = useState<Map<string, WaterCell>>(() =>
    initWaterCells(worldWaterSources),
  );

  const step = useMemo(createWaterStepper, []);
  const cellsRef = useRef(waterCells);
  cellsRef.current = waterCells;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const snapshot = getOccupancySnapshot();
      const isSolid = buildIsCellSolid(snapshot);

      setWaterCells((prev) => {
        return timed("water.tick", () => step(prev, snapshot, isSolid));
      });
    }, WATER_TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [getOccupancySnapshot, step]);

  const isInWater = useCallback(
    (x: number, y: number, z: number) => isPointInWater(cellsRef.current, x, y, z),
    [],
  );

  return { waterCells, isInWater };
}
