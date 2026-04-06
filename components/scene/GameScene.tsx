"use client";

import { Hud, PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { interactionContent, type InteractionId } from "@/data/interactions";
import type { WorldMaterial } from "@/data/world";
import { worldAuthoredCrops, worldBlocks, worldSky } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";
import { healthConfig } from "./game/config/health";
import { hungerConfig } from "./game/config/hunger";
import { hotbarSlotCount, inventoryStackLimit, mainInventorySlotCount } from "./game/config/inventory";
import { playerCollisionConfig } from "./game/config/player";
import { spawnCursorImageSrc } from "./game/config/spawnCursor";
import { unbreakableTerrainMaterials } from "./game/config/mining";
import { buildIntroTextColorRanges } from "./game/config/introBillboardCopy";
import { getSocialSignPositions, spawnBillboardLayout } from "./game/config/spawnBillboardLayout";
import {
  githubProfileUrl,
  googleScholarProfileUrl,
  linkedinProfileUrl,
} from "./game/config/socialLinks";
import { BlockPlacementController } from "./game/entities/BlockPlacementController";
import {
  BillboardIntroText,
  BillboardPhotoSign,
  BillboardSocialSign,
} from "./game/entities/Billboards";
import { BillboardPublicationRow } from "./game/entities/BillboardPublicationRow";
import { DroppedBlockItems } from "./game/entities/DroppedBlockItems";
import { TerrainBreakOverlay } from "./game/entities/TerrainBreakOverlay";
import { TerrainImpactParticles } from "./game/entities/TerrainImpactParticles";
import { InteractionRaycast } from "./game/interaction/InteractionRaycast";
import { PlayerArmViewmodel } from "./game/player/PlayerArmViewmodel";
import { PlayerController } from "./game/player/PlayerController";
import { useTerrainOccupancy } from "./game/state/useTerrainOccupancy";
import { SkySystem } from "./game/sky/SkySystem";
import type { BreakableTerrainHit, DroppedBlockItem, InventoryMaterial, InventorySlot } from "./game/types";
import { getTerrainBlockKey } from "./game/terrain/blockKeys";
import {
  getFixtureDropMaterial,
  resolveFixtureRemovalKeys,
  showcaseFixtures,
} from "./game/terrain/fixtureDefinitions";
import { createPlacedFixture, rotationYFromCameraForward } from "./game/terrain/fixturePlacement";
import { fenceConnectionsAt } from "./game/terrain/fenceConnections";
import { areFixtureSegmentsPlaceable, isTerrainBlockKeyOccupied } from "./game/terrain/occupancy";
import { composeVisibleTerrainBlocks } from "./game/terrain/visibleTerrainBlocks";
import { DoorBlock } from "./game/world/DoorBlock";
import { FenceBlock } from "./game/world/FenceBlock";
import { SlabBlock } from "./game/world/SlabBlock";
import { StairBlock } from "./game/world/StairBlock";
import { VoxelWorld } from "./game/world/VoxelWorld";
import { WaterWorld } from "./game/world/WaterWorld";
import { CropOverlay } from "./game/world/CropOverlay";
import { useWaterSimulation } from "./game/water/useWaterSimulation";
import { applyInventorySlotClick, tryAddOneItem } from "./game/inventory/inventorySlotActions";
import type { InventoryArea } from "./game/inventory/inventorySlotActions";
import { GameWorldHud } from "./game/ui/GameWorldHud";
import { InteractionPanel } from "./game/ui/InteractionPanel";

const spawnSocialPositions = getSocialSignPositions();

/**
 * Binds pointer lock to the WebGL canvas (`domElement` must match `document.pointerLockElement` or three-stdlib
 * never dispatches `lock` / `onLock`).
 *
 * We intentionally use a selector that matches no nodes: Drei registers click listeners in an effect inside
 * the Canvas subtree, which can run before the sibling HUD mounts — then `querySelectorAll("#enter-world")` is
 * empty and no listener is ever attached. UI buttons call `canvas.requestPointerLock()` directly instead.
 */
const POINTER_LOCK_CONTROLS_SELECTOR = "#__pointer_lock_no_auto_click__";
const POINTER_LOCK_LOOK_SPEED = 1;
const POINTER_LOCK_FROZEN_SPEED = 0;
const SPAWN_LOOK_UNLOCK_KEYS = new Set(["Space", "KeyW", "KeyA", "KeyS", "KeyD"]);

function ScenePointerLockControls({
  onLock,
  onUnlock,
  pointerSpeed,
}: {
  onLock: () => void;
  onUnlock: () => void;
  pointerSpeed: number;
}) {
  const gl = useThree((s) => s.gl);
  return (
    <PointerLockControls
      domElement={gl.domElement}
      selector={POINTER_LOCK_CONTROLS_SELECTOR}
      onLock={onLock}
      onUnlock={onUnlock}
      pointerSpeed={pointerSpeed}
    />
  );
}

type WorldDropOrigin = {
  blockPosition: [number, number, number];
  driftBase: [number, number];
};

const ENABLE_SCENE_SIZE_STABILIZATION = true;
const ENABLE_POST_MOUNT_INVALIDATE = true;

function WorldDropOriginSync({ originRef }: { originRef: React.MutableRefObject<WorldDropOrigin | null> }) {
  const { camera } = useThree();
  useFrame(() => {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-8) {
      fwd.set(0, 0, -1);
    } else {
      fwd.normalize();
    }
    const feetY = camera.position.y - playerCollisionConfig.eyeHeight;
    originRef.current = {
      blockPosition: [
        camera.position.x + fwd.x * 0.35,
        feetY + 0.25,
        camera.position.z + fwd.z * 0.35,
      ],
      driftBase: [fwd.x * 0.9, fwd.z * 0.9],
    };
  });
  return null;
}

function SceneRenderStabilizer({
  socialPositions,
}: {
  socialPositions: Record<"github" | "googleScholar" | "linkedin", [number, number, number]>;
}) {
  const { gl, camera, size, invalidate } = useThree();

  useEffect(() => {
    let rafId = 0;
    if (ENABLE_POST_MOUNT_INVALIDATE) {
      rafId = window.requestAnimationFrame(() => {
        invalidate();
      });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (ENABLE_SCENE_SIZE_STABILIZATION) {
      resizeObserver = new ResizeObserver(() => {
        invalidate();
      });
      resizeObserver.observe(gl.domElement);
      if (gl.domElement.parentElement) {
        resizeObserver.observe(gl.domElement.parentElement);
      }
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
  }, [camera, gl, invalidate, size, socialPositions]);

  return null;
}

export default function GameScene() {
  const [target, setTarget] = useState<InteractionId | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<InteractionId | null>(null);
  const [locked, setLocked] = useState(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const [playerSprinting, setPlayerSprinting] = useState(false);
  const [playerSneaking, setPlayerSneaking] = useState(false);
  const [armSwingTick, setArmSwingTick] = useState(0);
  const [placeSwingTick, setPlaceSwingTick] = useState(0);
  const [armSwingHeld, setArmSwingHeld] = useState(false);
  const [terrainImpactTrigger, setTerrainImpactTrigger] = useState(0);
  const [droppedItems, setDroppedItems] = useState<DroppedBlockItem[]>([]);
  const [hoveredInventoryMaterial, setHoveredInventoryMaterial] = useState<InventoryMaterial | null>(null);
  const [hasEnteredWorldThisSession, setHasEnteredWorldThisSession] = useState(false);
  const [spawnLookUnlocked, setSpawnLookUnlocked] = useState(false);
  const [spawnCursorScreenPosition, setSpawnCursorScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedInventorySlot, setSelectedInventorySlot] = useState(0);
  const [respawnToken, setRespawnToken] = useState(0);
  const [health, setHealth] = useState<number>(healthConfig.maxHealth);
  const maxHealth = healthConfig.maxHealth;
  const [hunger, setHunger] = useState<number>(hungerConfig.maxHunger);
  const hungerSaturationRef = useRef(0);
  const [hungerSaturationDisplay, setHungerSaturationDisplay] = useState(0);
  const [xpLevel] = useState(0);
  const [xpProgress] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [cursorItem, setCursorItem] = useState<InventorySlot>(null);
  const [mainInventorySlots, setMainInventorySlots] = useState<InventorySlot[]>(() =>
    Array.from({ length: mainInventorySlotCount }, () => null),
  );
  const [hotbarSlots, setHotbarSlots] = useState<InventorySlot[]>(() =>
    Array.from({ length: hotbarSlotCount }, () => null),
  );
  const [showcaseDoorOpen, setShowcaseDoorOpen] = useState<Record<string, boolean>>({
    "fx:door:home:5:-9": true,
  });
  const [plantedCrops, setPlantedCrops] = useState(() => new Set(worldAuthoredCrops));
  const plantedCropsRef = useRef(plantedCrops);
  plantedCropsRef.current = plantedCrops;

  const hotbarSlotsRef = useRef(hotbarSlots);
  const mainInventorySlotsRef = useRef(mainInventorySlots);
  const cursorItemRef = useRef(cursorItem);
  hotbarSlotsRef.current = hotbarSlots;
  mainInventorySlotsRef.current = mainInventorySlots;
  cursorItemRef.current = cursorItem;

  const {
    removedTerrainBlockKeys,
    setRemovedTerrainBlockKeys,
    placedTerrainBlocks,
    setPlacedTerrainBlocks,
    placedTerrainBlocksRef,
    placedFixtures,
    setPlacedFixtures,
    getOccupancySnapshot,
  } = useTerrainOccupancy(showcaseDoorOpen);

  const { waterCells, isInWater } = useWaterSimulation(getOccupancySnapshot);

  const placedFixturesRef = useRef(placedFixtures);
  placedFixturesRef.current = placedFixtures;

  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const worldCanvasElRef = useRef<HTMLCanvasElement | null>(null);
  const worldDropOriginRef = useRef<WorldDropOrigin | null>(null);
  const inventoryResumePointerLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suppressMenuOverlaysForInventoryResume, setSuppressMenuOverlaysForInventoryResume] = useState(false);

  const requestWorldPointerLockRaw = useCallback(() => {
    worldCanvasElRef.current?.requestPointerLock();
  }, []);

  const requestWorldPointerLock = useCallback(() => {
    if (health <= 0) return;
    requestWorldPointerLockRaw();
  }, [health, requestWorldPointerLockRaw]);
  const getCanvasRect = useCallback(() => {
    return worldCanvasElRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }, []);
  const resetSpawnCursorToViewportCenter = useCallback(() => {
    const rect = getCanvasRect();
    setSpawnCursorScreenPosition({ x: rect.width / 2, y: rect.height / 2 });
  }, [getCanvasRect]);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const handlePointerLockGained = useCallback(() => {
    if (inventoryResumePointerLockTimeoutRef.current) {
      clearTimeout(inventoryResumePointerLockTimeoutRef.current);
      inventoryResumePointerLockTimeoutRef.current = null;
    }
    setSuppressMenuOverlaysForInventoryResume(false);
    setLocked(true);
    setHasEnteredWorldThisSession(true);
    if (!spawnLookUnlocked) {
      resetSpawnCursorToViewportCenter();
    }
  }, [resetSpawnCursorToViewportCenter, spawnLookUnlocked]);

  const handlePointerLockLost = useCallback(() => {
    setLocked(false);
    setArmSwingHeld(false);
    setPlayerMoving(false);
    setTarget(null);
    setTargetLabel(null);
    setTargetHref(null);
    setHoveredInventoryMaterial(null);
  }, []);

  const onTarget = useCallback((id: InteractionId | null, label: string | null, href: string | null) => {
    setTarget(id);
    setTargetLabel(label);
    setTargetHref(href);
  }, []);

  const handleDistanceWalked = useCallback((distance: number) => {
    hungerSaturationRef.current += distance * hungerConfig.saturationPerBlock;
    if (hungerSaturationRef.current >= hungerConfig.saturationThreshold) {
      hungerSaturationRef.current = 0;
      setHunger((prev) => Math.max(prev - hungerConfig.hungerPointsLostPerTrigger, 0));
      setHungerSaturationDisplay(0);
    } else {
      setHungerSaturationDisplay(hungerSaturationRef.current);
    }
  }, []);

  const hungerWobbleActive = useMemo(
    () => playerMoving && hungerSaturationDisplay >= hungerConfig.wobbleMinSaturation,
    [playerMoving, hungerSaturationDisplay],
  );

  const [screenShakeActive, setScreenShakeActive] = useState(false);
  const screenShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCriticalWobble = health === healthConfig.criticalHealthThreshold;

  const triggerDamageFeedback = useCallback(() => {
    setScreenShakeActive(true);
    if (screenShakeTimerRef.current) clearTimeout(screenShakeTimerRef.current);
    screenShakeTimerRef.current = setTimeout(
      () => setScreenShakeActive(false),
      healthConfig.screenShakeDurationMs,
    );
  }, []);

  const resetVitals = useCallback(() => {
    setHealth(healthConfig.maxHealth);
    setHunger(hungerConfig.maxHunger);
    hungerSaturationRef.current = 0;
    setHungerSaturationDisplay(0);
  }, []);

  const handleRespawn = useCallback(() => {
    resetVitals();
    setRespawnToken((t) => t + 1);
    requestWorldPointerLockRaw();
  }, [resetVitals, requestWorldPointerLockRaw]);

  const handleDeathReturnToTitle = useCallback(() => {
    resetVitals();
    setRespawnToken((t) => t + 1);
    setHasEnteredWorldThisSession(false);
  }, [resetVitals]);

  useEffect(() => {
    if (hunger > 0 || health <= healthConfig.starvationMinHealth) return;

    const interval = setInterval(() => {
      setHealth((prev) => {
        const next = Math.max(prev - 1, healthConfig.starvationMinHealth);
        if (next < prev) {
          triggerDamageFeedback();
        }
        return next;
      });
    }, healthConfig.starvationDamageIntervalMs);

    return () => clearInterval(interval);
  }, [hunger, health, triggerDamageFeedback]);

  useEffect(() => {
    return () => {
      if (screenShakeTimerRef.current) clearTimeout(screenShakeTimerRef.current);
    };
  }, []);

  const triggerTerrainImpact = useCallback(() => {
    setTerrainImpactTrigger((current) => current + 1);
  }, []);

  const triggerPlacementSwing = useCallback(() => {
    setPlaceSwingTick((current) => current + 1);
  }, []);

  const handleToggleDoor = useCallback((primaryId: string) => {
    if (primaryId.startsWith("fx:")) {
      setShowcaseDoorOpen((prev) => ({ ...prev, [primaryId]: !prev[primaryId] }));
    } else {
      setPlacedFixtures((fixtures) =>
        fixtures.map((f) =>
          f.primaryId === primaryId && f.fixtureKind === "door" ? { ...f, isOpen: !f.isOpen } : f,
        ),
      );
    }
  }, [setPlacedFixtures]);

  const pushDroppedItem = useCallback((material: InventoryMaterial, blockPosition: [number, number, number], idPrefix: string) => {
    setDroppedItems((current) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.9 + Math.random() * 0.45;
      return [
        ...current,
        {
          id: `${idPrefix}-${current.length}-${Date.now()}`,
          material,
          blockPosition,
          spawnedAt: performance.now() / 1000,
          phase: Math.random() * Math.PI * 2,
          drift: [Math.cos(angle) * speed, Math.sin(angle) * speed] as [number, number],
        },
      ];
    });
  }, []);

  const handleFallLand = useCallback(
    (fallDistance: number, feetPosition: [number, number, number]) => {
      if (fallDistance > 0.05) {
        const blocks = Math.floor(fallDistance);
        const rawDamage = Math.max(0, blocks - healthConfig.fallDamageSafeDistance);
        const damage = Math.min(rawDamage, healthConfig.fallDamageMaxPoints);
        if (damage > 0) {
          setHealth((prev) => {
            const next = Math.max(prev - damage, 0);
            if (next < prev) triggerDamageFeedback();
            return next;
          });
        }
      }

      const feetY = feetPosition[1];
      const blockCenterY = Math.round((feetY - 0.5) * 2) / 2;
      const blockBelowKey = getTerrainBlockKey([
        Math.round(feetPosition[0]),
        blockCenterY,
        Math.round(feetPosition[2]),
      ]);
      const blockMaterial = visibleTerrainBlocksByKeyRef.current.get(blockBelowKey);
      if (blockMaterial === "farmland") {
        const blockPos: [number, number, number] = [
          Math.round(feetPosition[0]),
          blockCenterY,
          Math.round(feetPosition[2]),
        ];
        if (placedTerrainBlocksRef.current.some((e) => getTerrainBlockKey(e.position) === blockBelowKey)) {
          setPlacedTerrainBlocks((cur) =>
            cur.map((e) => (getTerrainBlockKey(e.position) === blockBelowKey ? { ...e, material: "dirt" as const } : e)),
          );
        } else {
          setRemovedTerrainBlockKeys((cur) => new Set(cur).add(blockBelowKey));
          setPlacedTerrainBlocks((cur) => [...cur, { position: blockPos, material: "dirt", solid: true }]);
        }
        if (plantedCropsRef.current.has(blockBelowKey)) {
          setPlantedCrops((prev) => {
            const next = new Set(prev);
            next.delete(blockBelowKey);
            return next;
          });
          pushDroppedItem("carrot", blockPos, blockBelowKey);
        }
      }
    },
    [triggerDamageFeedback, pushDroppedItem, setPlacedTerrainBlocks, setRemovedTerrainBlockKeys],
  );

  const removeTerrainBlock = useCallback((block: BreakableTerrainHit) => {
    if (unbreakableTerrainMaterials.has(block.terrainMaterial)) return;

    const fixtureRemovalKeys = resolveFixtureRemovalKeys(block.blockKey, placedFixturesRef.current);
    if (fixtureRemovalKeys) {
      const primaryId = fixtureRemovalKeys[0];
      const dropMaterial = getFixtureDropMaterial(block.blockKey, placedFixturesRef.current);

      if (primaryId.startsWith("fx:")) {
        setRemovedTerrainBlockKeys((current) => {
          const next = new Set(current);
          for (const key of fixtureRemovalKeys) {
            next.add(key);
          }
          return next;
        });
      }

      setPlacedFixtures((prev) => prev.filter((p) => p.primaryId !== primaryId));

      if (dropMaterial) {
        pushDroppedItem(dropMaterial, block.blockPosition, block.blockKey);
      }
      return;
    }

    if (placedTerrainBlocksRef.current.some((entry) => getTerrainBlockKey(entry.position) === block.blockKey)) {
      setPlacedTerrainBlocks((current) => current.filter((entry) => getTerrainBlockKey(entry.position) !== block.blockKey));
    } else {
      setRemovedTerrainBlockKeys((current) => {
        if (current.has(block.blockKey)) return current;
        return new Set(current).add(block.blockKey);
      });
    }

    const droppedMaterial: InventoryMaterial | null =
      block.terrainMaterial === "wood"
        ? "wood"
        : block.terrainMaterial === "woodPlanks"
          ? "woodPlanks"
          : block.terrainMaterial === "grass" || block.terrainMaterial === "grassShade" || block.terrainMaterial === "dirt" || block.terrainMaterial === "farmland"
            ? "dirt"
            : null;

    if (droppedMaterial) {
      pushDroppedItem(droppedMaterial, block.blockPosition, block.blockKey);
    }

    if (plantedCropsRef.current.has(block.blockKey)) {
      setPlantedCrops((prev) => {
        const next = new Set(prev);
        next.delete(block.blockKey);
        return next;
      });
      pushDroppedItem("carrot", block.blockPosition, block.blockKey);
    }
  }, [placedTerrainBlocksRef, pushDroppedItem, setPlacedTerrainBlocks, setPlacedFixtures, setRemovedTerrainBlockKeys]);

  const spawnDroppedItemsFromStack = useCallback((stack: NonNullable<InventorySlot>) => {
    const origin = worldDropOriginRef.current;
    if (!origin) return;
    setDroppedItems((current) => {
      const next = [...current];
      const baseLen = next.length;
      for (let i = 0; i < stack.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.35 + Math.random() * 0.35;
        next.push({
          id: `inv-drop-${Date.now()}-${baseLen + i}-${Math.random().toString(36).slice(2, 9)}`,
          material: stack.material,
          blockPosition: [...origin.blockPosition] as [number, number, number],
          spawnedAt: performance.now() / 1000,
          phase: Math.random() * Math.PI * 2,
          drift: [
            origin.driftBase[0] + Math.cos(angle) * speed,
            origin.driftBase[1] + Math.sin(angle) * speed,
          ] as [number, number],
        });
      }
      return next;
    });
  }, []);

  const dropCursorStackIfAny = useCallback(() => {
    const c = cursorItemRef.current;
    if (c) {
      spawnDroppedItemsFromStack(c);
      setCursorItem(null);
    }
  }, [spawnDroppedItemsFromStack]);

  const closeInventory = useCallback(() => {
    dropCursorStackIfAny();
    setInventoryOpen(false);
    setSuppressMenuOverlaysForInventoryResume(true);
    if (inventoryResumePointerLockTimeoutRef.current) {
      clearTimeout(inventoryResumePointerLockTimeoutRef.current);
    }
    inventoryResumePointerLockTimeoutRef.current = setTimeout(() => {
      inventoryResumePointerLockTimeoutRef.current = null;
      setSuppressMenuOverlaysForInventoryResume(false);
    }, 750);
    requestWorldPointerLock();
  }, [dropCursorStackIfAny, requestWorldPointerLock]);

  const openInventory = useCallback(() => {
    if (!locked || activePanel || health <= 0) return;
    setInventoryOpen(true);
    document.exitPointerLock();
  }, [locked, activePanel, health]);

  const handleInventorySlotClick = useCallback((area: InventoryArea, index: number, button: "left" | "right") => {
    const next = applyInventorySlotClick(
      {
        mainInventorySlots: mainInventorySlotsRef.current,
        hotbarSlots: hotbarSlotsRef.current,
        cursorItem: cursorItemRef.current,
      },
      area,
      index,
      button,
      inventoryStackLimit,
    );
    setHotbarSlots(next.hotbarSlots);
    setMainInventorySlots(next.mainInventorySlots);
    setCursorItem(next.cursorItem);
  }, []);

  const handleDropInventoryCursor = useCallback(() => {
    dropCursorStackIfAny();
  }, [dropCursorStackIfAny]);

  const collectDroppedItem = useCallback((item: DroppedBlockItem) => {
    const next = tryAddOneItem(
      hotbarSlotsRef.current,
      mainInventorySlotsRef.current,
      item.material,
      inventoryStackLimit,
    );
    if (!next) return;
    setHotbarSlots(next.hotbarSlots);
    setMainInventorySlots(next.mainInventorySlots);
    setDroppedItems((current) => current.filter((entry) => entry.id !== item.id));
  }, []);

  useEffect(() => {
    if (health !== 0) return;
    document.exitPointerLock();
    setInventoryOpen(false);
    setSuppressMenuOverlaysForInventoryResume(false);
    if (inventoryResumePointerLockTimeoutRef.current) {
      clearTimeout(inventoryResumePointerLockTimeoutRef.current);
      inventoryResumePointerLockTimeoutRef.current = null;
    }
    const c = cursorItemRef.current;
    if (c) {
      spawnDroppedItemsFromStack(c);
      setCursorItem(null);
    }
    setScreenShakeActive(false);
    if (screenShakeTimerRef.current) {
      clearTimeout(screenShakeTimerRef.current);
      screenShakeTimerRef.current = null;
    }
  }, [health, spawnDroppedItemsFromStack]);

  const decrementSelectedHotbarStack = useCallback(
    (material: InventoryMaterial) => {
      setHotbarSlots((slots) => {
        const sel = slots[selectedInventorySlot];
        if (!sel || sel.material !== material || sel.count <= 0) return slots;
        const next = [...slots];
        const nc = sel.count - 1;
        next[selectedInventorySlot] = nc <= 0 ? null : { material: sel.material, count: nc };
        return next;
      });
    },
    [selectedInventorySlot],
  );

  const handlePlantCrop = useCallback(
    (blockKey: string) => {
      if (plantedCropsRef.current.has(blockKey)) return;
      setPlantedCrops((prev) => new Set(prev).add(blockKey));
      decrementSelectedHotbarStack("carrot");
    },
    [decrementSelectedHotbarStack],
  );

  const handleHarvestCrop = useCallback(
    (block: BreakableTerrainHit) => {
      if (!plantedCropsRef.current.has(block.blockKey)) return;
      setPlantedCrops((prev) => {
        const next = new Set(prev);
        next.delete(block.blockKey);
        return next;
      });
      pushDroppedItem("carrot", block.blockPosition, block.blockKey);
    },
    [pushDroppedItem],
  );

  const shouldInterceptBreakHit = useCallback(
    (blockKey: string, terrainMaterial: Exclude<WorldMaterial, "cloud">) => {
      return terrainMaterial === "farmland" && plantedCropsRef.current.has(blockKey);
    },
    [],
  );

  const placeFromInventory = useCallback(
    (
      material: InventoryMaterial,
      adjacentBlockPosition: [number, number, number],
      facing: { forwardX: number; forwardZ: number },
    ) => {
      const cx = Math.round(adjacentBlockPosition[0]);
      const cz = Math.round(adjacentBlockPosition[2]);
      const snapshot = getOccupancySnapshot();
      const rotationY = rotationYFromCameraForward(facing.forwardX, facing.forwardZ);

      if (material === "dirt" || material === "wood" || material === "woodPlanks") {
        const blockKey = getTerrainBlockKey(adjacentBlockPosition);
        if (isTerrainBlockKeyOccupied(snapshot, blockKey)) return;

        const worldMaterial: WorldMaterial =
          material === "wood" ? "wood" : material === "woodPlanks" ? "woodPlanks" : "dirt";

        decrementSelectedHotbarStack(material);

        setPlacedTerrainBlocks((current) => {
          if (current.some((entry) => getTerrainBlockKey(entry.position) === blockKey)) return current;
          return [...current, { position: adjacentBlockPosition, material: worldMaterial, solid: true }];
        });
        return;
      }

      if (material === "woodenSlab") {
        const fixture = createPlacedFixture("slab", cx, cz, 0);
        if (!areFixtureSegmentsPlaceable(snapshot, fixture.physicsSegments)) return;
        decrementSelectedHotbarStack(material);
        setPlacedFixtures((prev) => [...prev, fixture]);
        return;
      }

      if (material === "woodenStair") {
        const fixture = createPlacedFixture("stair", cx, cz, rotationY);
        if (!areFixtureSegmentsPlaceable(snapshot, fixture.physicsSegments)) return;
        decrementSelectedHotbarStack(material);
        setPlacedFixtures((prev) => [...prev, fixture]);
        return;
      }

      if (material === "woodenFence") {
        const fixture = createPlacedFixture("fence", cx, cz, 0);
        if (!areFixtureSegmentsPlaceable(snapshot, fixture.physicsSegments)) return;
        decrementSelectedHotbarStack(material);
        setPlacedFixtures((prev) => [...prev, fixture]);
        return;
      }

      if (material === "woodenDoor") {
        const fixture = createPlacedFixture("door", cx, cz, rotationY);
        if (!areFixtureSegmentsPlaceable(snapshot, fixture.physicsSegments)) return;
        decrementSelectedHotbarStack(material);
        setPlacedFixtures((prev) => [...prev, fixture]);
        return;
      }
    },
    [decrementSelectedHotbarStack, getOccupancySnapshot, setPlacedFixtures, setPlacedTerrainBlocks],
  );

  useEffect(() => {
    const handleHotbarKeyDown = (event: KeyboardEvent) => {
      if (!locked || activePanel || inventoryOpen) return;
      if (!event.code.startsWith("Digit")) return;

      const nextSlot = Number(event.code.replace("Digit", "")) - 1;
      if (!Number.isInteger(nextSlot) || nextSlot < 0 || nextSlot >= hotbarSlotCount) return;

      event.preventDefault();
      setSelectedInventorySlot(nextSlot);
    };

    window.addEventListener("keydown", handleHotbarKeyDown);
    return () => window.removeEventListener("keydown", handleHotbarKeyDown);
  }, [activePanel, inventoryOpen, locked]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyE" && !event.repeat) {
        if (inventoryOpen) {
          event.preventDefault();
          closeInventory();
        } else if (locked && !activePanel && health > 0) {
          event.preventDefault();
          openInventory();
        }
      }
      if (event.key === "Escape" && inventoryOpen) {
        event.preventDefault();
        closeInventory();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePanel, closeInventory, health, inventoryOpen, locked, openInventory]);

  useEffect(() => {
    if (!locked || spawnLookUnlocked || inventoryOpen) return;

    const unlockSpawnLook = () => {
      setSpawnLookUnlocked(true);
      resetSpawnCursorToViewportCenter();
    };
    const handleSpawnMouseMove = (event: MouseEvent) => {
      const rect = getCanvasRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      const current = spawnCursorScreenPosition ?? { x: width / 2, y: height / 2 };
      const nextX = THREE.MathUtils.clamp(current.x + event.movementX, 0, width);
      const nextY = THREE.MathUtils.clamp(current.y + event.movementY, 0, height);

      setSpawnCursorScreenPosition({ x: nextX, y: nextY });
      if (nextX <= 0 || nextX >= width || nextY <= 0 || nextY >= height) {
        unlockSpawnLook();
      }
    };
    const handleSpawnKeyDown = (event: KeyboardEvent) => {
      if (SPAWN_LOOK_UNLOCK_KEYS.has(event.code)) {
        unlockSpawnLook();
      }
    };

    window.addEventListener("mousemove", handleSpawnMouseMove);
    window.addEventListener("keydown", handleSpawnKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleSpawnMouseMove);
      window.removeEventListener("keydown", handleSpawnKeyDown);
    };
  }, [getCanvasRect, inventoryOpen, locked, resetSpawnCursorToViewportCenter, spawnCursorScreenPosition, spawnLookUnlocked]);

  useEffect(() => {
    if (spawnLookUnlocked || !locked) {
      resetSpawnCursorToViewportCenter();
    }
  }, [locked, resetSpawnCursorToViewportCenter, spawnLookUnlocked]);

  useEffect(() => {
    const handleClick = () => {
      if (!locked) return;

      if (targetHref) {
        document.exitPointerLock();
        window.open(targetHref, "_blank", "noopener,noreferrer");
        return;
      }

      if (!target) return;
      setActivePanel(target);
      document.exitPointerLock();
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [locked, target, targetHref]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (targetHref) return;
      if (!locked || event.button !== 0) return;
      setArmSwingHeld(true);
      setArmSwingTick((current) => current + 1);
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [locked, targetHref]);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      setArmSwingHeld(false);
    };

    const handleWindowBlur = () => {
      setArmSwingHeld(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (locked && !activePanel) return;
    setHoveredInventoryMaterial(null);
  }, [activePanel, locked]);

  const selectedInventoryMaterial = hotbarSlots[selectedInventorySlot]?.material ?? null;
  const heldInventoryMaterial = hoveredInventoryMaterial ?? selectedInventoryMaterial;
  const selectedHotbarSlot = hotbarSlots[selectedInventorySlot];
  const placementAvailableCount =
    selectedHotbarSlot && heldInventoryMaterial === selectedHotbarSlot.material ? selectedHotbarSlot.count : 0;
  const interactionPointerNdc = useMemo(() => {
    if (!locked || spawnLookUnlocked || !spawnCursorScreenPosition) {
      return { x: 0, y: 0 };
    }
    const rect = getCanvasRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return {
      x: (spawnCursorScreenPosition.x / rect.width) * 2 - 1,
      y: -((spawnCursorScreenPosition.y / rect.height) * 2 - 1),
    };
  }, [getCanvasRect, locked, spawnCursorScreenPosition, spawnLookUnlocked]);
  const visibleTerrainBlocks = useMemo(
    () => composeVisibleTerrainBlocks(worldBlocks, removedTerrainBlockKeys, placedTerrainBlocks),
    [placedTerrainBlocks, removedTerrainBlockKeys],
  );
  const visibleTerrainBlocksByKey = useMemo(() => {
    const map = new Map<string, WorldMaterial>();
    for (const b of visibleTerrainBlocks) {
      map.set(getTerrainBlockKey(b.position), b.material);
    }
    return map;
  }, [visibleTerrainBlocks]);
  const visibleTerrainBlocksByKeyRef = useRef(visibleTerrainBlocksByKey);
  visibleTerrainBlocksByKeyRef.current = visibleTerrainBlocksByKey;

  const introLayout = spawnBillboardLayout.introText;
  const { linkColor: introLinkColor, ...introTextMeshProps } = introLayout;
  const introColorRanges = useMemo(
    () => buildIntroTextColorRanges(introTextMeshProps.color ?? "#f8fafc", introLinkColor ?? "#0865c9"),
    [introLinkColor, introTextMeshProps.color],
  );

  const content = activePanel ? interactionContent[activePanel] : null;

  return (
    <div className={`scene-shell${screenShakeActive ? " scene-shell--damage-shake" : ""}`}>
      <Canvas
        camera={{ fov: 70 }}
        shadows
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        onCreated={({ gl }) => {
          worldCanvasElRef.current = gl.domElement as HTMLCanvasElement;
        }}
      >
        <SceneRenderStabilizer socialPositions={spawnSocialPositions} />
        <ambientLight ref={ambientLightRef} intensity={worldSky.lighting.dayAmbient} />
        <hemisphereLight
          ref={hemisphereLightRef}
          intensity={worldSky.lighting.dayHemisphere}
          color={worldSky.lighting.dayHemisphereColor}
          groundColor={worldSky.lighting.dayGroundColor}
        />
        <directionalLight
          ref={directionalLightRef}
          intensity={worldSky.lighting.dayDirectional}
          position={[9, 12, 4]}
          color={worldSky.lighting.sunColor}
          castShadow
        />

        <SkySystem
          ambientLightRef={ambientLightRef}
          hemisphereLightRef={hemisphereLightRef}
          directionalLightRef={directionalLightRef}
        />
        <VoxelWorld blocks={visibleTerrainBlocks} />
        <WaterWorld cells={waterCells} />
        <CropOverlay cropKeys={plantedCrops} visibleBlocks={visibleTerrainBlocks} />
        {!removedTerrainBlockKeys.has("fx:door:home:5:-9") ? (
          <DoorBlock
            position={[5, 3, -9]}
            fixturePrimaryId="fx:door:home:5:-9"
            terrainMaterial="woodPlanks"
            breakPosition={[5, 3, -9]}
            rotationY={0}
            doorYMin={1}
            doorYMax={5}
            isOpen={Boolean(showcaseDoorOpen["fx:door:home:5:-9"])}
          />
        ) : null}
        {!removedTerrainBlockKeys.has("fx:stair:home:4:-9") ? (
          <StairBlock
            texturePath={assetPath("/textures/world/cobblestone.svg")}
            position={[4, 1.5, -9]}
            fixturePrimaryId="fx:stair:home:4:-9"
            terrainMaterial="cobblestone"
            breakPosition={[4, 1.5, -9]}
            rotation={[0, (3 * Math.PI) / 2, 0]}
          />
        ) : null}
        {showcaseFixtures
          .filter((f) => f.fixtureKind === "fence" && f.primaryId.startsWith("fx:fence:well:"))
          .map((f) => {
            const cx = Math.round(f.breakPosition[0]);
            const cz = Math.round(f.breakPosition[2]);
            return !removedTerrainBlockKeys.has(f.primaryId) ? (
              <FenceBlock
                key={f.primaryId}
                position={f.breakPosition}
                fixturePrimaryId={f.primaryId}
                terrainMaterial="woodPlanks"
                breakPosition={f.breakPosition}
                stackLevels={3}
                {...fenceConnectionsAt(cx, cz, removedTerrainBlockKeys, placedFixtures)}
              />
            ) : null;
          })}
        {placedFixtures.map((f) => {
          const cx = Math.round(f.breakPosition[0]);
          const cz = Math.round(f.breakPosition[2]);
          if (f.fixtureKind === "slab") {
            return (
              <SlabBlock
                key={f.primaryId}
                texturePath={f.texturePath}
                position={f.breakPosition}
                fixturePrimaryId={f.primaryId}
                terrainMaterial={f.terrainMaterial}
                breakPosition={f.breakPosition}
              />
            );
          }
          if (f.fixtureKind === "stair") {
            return (
              <StairBlock
                key={f.primaryId}
                texturePath={f.texturePath}
                position={f.breakPosition}
                fixturePrimaryId={f.primaryId}
                terrainMaterial={f.terrainMaterial}
                breakPosition={f.breakPosition}
                rotation={[0, f.rotationY, 0]}
              />
            );
          }
          if (f.fixtureKind === "fence") {
            return (
              <FenceBlock
                key={f.primaryId}
                position={f.breakPosition}
                fixturePrimaryId={f.primaryId}
                terrainMaterial={f.terrainMaterial}
                breakPosition={f.breakPosition}
                {...fenceConnectionsAt(cx, cz, removedTerrainBlockKeys, placedFixtures)}
              />
            );
          }
          if (f.fixtureKind === "door") {
            return (
              <DoorBlock
                key={f.primaryId}
                position={f.breakPosition}
                fixturePrimaryId={f.primaryId}
                terrainMaterial={f.terrainMaterial}
                breakPosition={f.breakPosition}
                rotationY={f.rotationY}
                isOpen={Boolean(f.isOpen)}
              />
            );
          }
          return null;
        })}
        <WorldDropOriginSync originRef={worldDropOriginRef} />
        <DroppedBlockItems
          items={droppedItems}
          canCollect={locked && !activePanel && !inventoryOpen}
          onCollect={collectDroppedItem}
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <TerrainImpactParticles
          trigger={terrainImpactTrigger}
          enabled={locked && !activePanel}
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <TerrainBreakOverlay
          trigger={terrainImpactTrigger}
          enabled={locked && !activePanel}
          swingHeld={armSwingHeld}
          removedBlockKeys={removedTerrainBlockKeys}
          onBreakBlock={removeTerrainBlock}
          shouldInterceptHit={shouldInterceptBreakHit}
          onInterceptedHit={handleHarvestCrop}
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <BlockPlacementController
          enabled={locked && !activePanel}
          heldInventoryMaterial={heldInventoryMaterial}
          availableCount={placementAvailableCount}
          onPlaceBlock={placeFromInventory}
          onRightClickSwing={triggerPlacementSwing}
          onToggleDoor={handleToggleDoor}
          onPlantCrop={handlePlantCrop}
          plantedCropKeys={plantedCrops}
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <BillboardPhotoSign
          texturePath={spawnBillboardLayout.photo.texturePath}
          position={spawnBillboardLayout.photo.position}
          width={spawnBillboardLayout.photo.width}
          height={spawnBillboardLayout.photo.height}
        />
        <BillboardIntroText {...introTextMeshProps} colorRanges={introColorRanges} />
        <BillboardSocialSign
          label="LinkedIn"
          href={linkedinProfileUrl}
          texturePath={assetPath("/textures/world/linkedin-logo.svg")}
          position={spawnSocialPositions.linkedin}
          isActive={targetHref === linkedinProfileUrl}
        />
        <BillboardSocialSign
          label="Google Scholar"
          href={googleScholarProfileUrl}
          texturePath={assetPath("/textures/world/google-scholar-logo.svg")}
          position={spawnSocialPositions.googleScholar}
          isActive={targetHref === googleScholarProfileUrl}
        />
        <BillboardSocialSign
          label="GitHub"
          href={githubProfileUrl}
          texturePath={assetPath("/textures/world/github-logo.svg")}
          position={spawnSocialPositions.github}
          isActive={targetHref === githubProfileUrl}
        />
        <BillboardPublicationRow />

        {(locked || heldInventoryMaterial) && !activePanel && !inventoryOpen ? (
          <Hud renderPriority={1}>
            <PerspectiveCamera makeDefault position={[0, 0, 3.2]} fov={48} />
            <PlayerArmViewmodel
              moving={playerMoving}
              sprinting={playerSprinting}
              sneaking={playerSneaking}
              swingTick={armSwingTick}
              placeSwingTick={placeSwingTick}
              swingHeld={armSwingHeld}
              onSwingCycle={triggerTerrainImpact}
              heldInventoryMaterial={heldInventoryMaterial}
            />
          </Hud>
        ) : null}

        <PlayerController
          enabled={locked}
          respawnToken={respawnToken}
          onMovingChange={setPlayerMoving}
          onSprintingChange={setPlayerSprinting}
          onSneakingChange={setPlayerSneaking}
          onDistanceWalked={handleDistanceWalked}
          onFallLand={handleFallLand}
          getOccupancySnapshot={getOccupancySnapshot}
          sprintAllowed={hunger > hungerConfig.sprintHungerCutoff}
          isInWater={isInWater}
        />
        <InteractionRaycast onTarget={onTarget} pointerNdc={interactionPointerNdc} />
        <ScenePointerLockControls
          onLock={handlePointerLockGained}
          onUnlock={handlePointerLockLost}
          pointerSpeed={spawnLookUnlocked ? POINTER_LOCK_LOOK_SPEED : POINTER_LOCK_FROZEN_SPEED}
        />
      </Canvas>

      <GameWorldHud
        locked={locked}
        isDead={health <= 0}
        isPaused={!locked && hasEnteredWorldThisSession}
        suppressMenuOverlaysForInventoryResume={suppressMenuOverlaysForInventoryResume}
        onQuitToTitle={() => setHasEnteredWorldThisSession(false)}
        onRequestPointerLock={requestWorldPointerLock}
        onRespawn={handleRespawn}
        onDeathReturnToTitle={handleDeathReturnToTitle}
        activePanel={Boolean(activePanel)}
        inventoryOpen={inventoryOpen}
        mainInventorySlots={mainInventorySlots}
        hotbarSlots={hotbarSlots}
        cursorItem={cursorItem}
        onInventorySlotClick={handleInventorySlotClick}
        onDropInventoryCursor={handleDropInventoryCursor}
        onSelectHotbarFromInventory={setSelectedInventorySlot}
        targetLabel={targetLabel}
        crosshairScreenPosition={locked ? spawnCursorScreenPosition : null}
        spawnLookUnlocked={spawnLookUnlocked}
        spawnCursorImageSrc={spawnCursorImageSrc}
        selectedInventorySlot={selectedInventorySlot}
        health={health}
        maxHealth={maxHealth}
        hunger={hunger}
        maxHunger={hungerConfig.maxHunger}
        hungerWobbleActive={hungerWobbleActive}
        healthCriticalWobble={healthCriticalWobble}
        xpProgress={xpProgress}
        xpLevel={xpLevel}
        onSelectSlot={(index, material) => {
                  setSelectedInventorySlot(index);
                  if (material) setHoveredInventoryMaterial(material);
                }}
        onHoverMaterial={(material) => setHoveredInventoryMaterial(material)}
        onSlotMouseLeave={(material) => {
                  setHoveredInventoryMaterial((current) => (current === material ? null : current));
                }}
      />

      {content ? <InteractionPanel content={content} onClose={() => setActivePanel(null)} /> : null}
    </div>
  );
}
