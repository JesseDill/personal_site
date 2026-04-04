import type { WorldBlock } from "@/data/world";
import { useCallback, useMemo, useRef, useState } from "react";
import type { PlacedFixture } from "../types";
import { createTerrainOccupancySnapshot, type TerrainOccupancySnapshot } from "../terrain/occupancy";

export function useTerrainOccupancy() {
  const [removedTerrainBlockKeys, setRemovedTerrainBlockKeys] = useState(() => new Set<string>());
  const [placedTerrainBlocks, setPlacedTerrainBlocks] = useState<WorldBlock[]>([]);
  const [placedFixtures, setPlacedFixtures] = useState<PlacedFixture[]>([]);

  const placedTerrainBlocksRef = useRef(placedTerrainBlocks);
  placedTerrainBlocksRef.current = placedTerrainBlocks;

  const occupancySnapshot = useMemo(
    () => createTerrainOccupancySnapshot(removedTerrainBlockKeys, placedTerrainBlocks, placedFixtures),
    [removedTerrainBlockKeys, placedTerrainBlocks, placedFixtures],
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
    placedFixtures,
    setPlacedFixtures,
    occupancySnapshot,
    getOccupancySnapshot,
  };
}
