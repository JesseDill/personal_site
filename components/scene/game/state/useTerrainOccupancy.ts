import type { WorldBlock } from "@/data/world";
import { useCallback, useMemo, useRef, useState } from "react";
import { createTerrainOccupancySnapshot, type TerrainOccupancySnapshot } from "../terrain/occupancy";

export function useTerrainOccupancy() {
  const [removedTerrainBlockKeys, setRemovedTerrainBlockKeys] = useState(() => new Set<string>());
  const [placedTerrainBlocks, setPlacedTerrainBlocks] = useState<WorldBlock[]>([]);

  const placedTerrainBlocksRef = useRef(placedTerrainBlocks);
  placedTerrainBlocksRef.current = placedTerrainBlocks;

  const occupancySnapshot = useMemo(
    () => createTerrainOccupancySnapshot(removedTerrainBlockKeys, placedTerrainBlocks),
    [removedTerrainBlockKeys, placedTerrainBlocks],
  );

  const occupancyRef = useRef<TerrainOccupancySnapshot>(occupancySnapshot);
  occupancyRef.current = occupancySnapshot;

  const getOccupancySnapshot = useCallback(() => occupancyRef.current, []);

  return {
    removedTerrainBlockKeys,
    setRemovedTerrainBlockKeys,
    placedTerrainBlocks,
    setPlacedTerrainBlocks,
    placedTerrainBlocksRef,
    occupancySnapshot,
    getOccupancySnapshot,
  };
}
