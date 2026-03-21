"use client";

import { Hud, PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { interactionContent, type InteractionId } from "@/data/interactions";
import { landmarks, worldBlocks, worldSky } from "@/data/world";
import { hotbarSlotCount } from "./game/config/inventory";
import { unbreakableTerrainMaterials } from "./game/config/mining";
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
import { InteractableLandmark } from "./game/entities/InteractableLandmark";
import { TerrainBreakOverlay } from "./game/entities/TerrainBreakOverlay";
import { TerrainImpactParticles } from "./game/entities/TerrainImpactParticles";
import { InteractionRaycast } from "./game/interaction/InteractionRaycast";
import { PlayerArmViewmodel } from "./game/player/PlayerArmViewmodel";
import { PlayerController } from "./game/player/PlayerController";
import { useTerrainOccupancy } from "./game/state/useTerrainOccupancy";
import { SkySystem } from "./game/sky/SkySystem";
import type { BreakableTerrainHit, DroppedBlockItem } from "./game/types";
import { getTerrainBlockKey } from "./game/terrain/blockKeys";
import { composeVisibleTerrainBlocks } from "./game/terrain/visibleTerrainBlocks";
import { VoxelWorld } from "./game/world/VoxelWorld";
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

function ScenePointerLockControls({
  onLock,
  onUnlock,
}: {
  onLock: () => void;
  onUnlock: () => void;
}) {
  const gl = useThree((s) => s.gl);
  return (
    <PointerLockControls
      domElement={gl.domElement}
      selector={POINTER_LOCK_CONTROLS_SELECTOR}
      onLock={onLock}
      onUnlock={onUnlock}
    />
  );
}

export default function GameScene() {
  const [target, setTarget] = useState<InteractionId | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<InteractionId | null>(null);
  const [locked, setLocked] = useState(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const [armSwingTick, setArmSwingTick] = useState(0);
  const [placeSwingTick, setPlaceSwingTick] = useState(0);
  const [armSwingHeld, setArmSwingHeld] = useState(false);
  const [terrainImpactTrigger, setTerrainImpactTrigger] = useState(0);
  const [droppedItems, setDroppedItems] = useState<DroppedBlockItem[]>([]);
  const [hoveredInventoryMaterial, setHoveredInventoryMaterial] = useState<DroppedBlockItem["material"] | null>(null);
  const [hasEnteredWorldThisSession, setHasEnteredWorldThisSession] = useState(false);
  const [selectedInventorySlot, setSelectedInventorySlot] = useState(0);
  const [collectedInventory, setCollectedInventory] = useState<Record<DroppedBlockItem["material"], number>>({
    dirt: 0,
    wood: 0,
  });
  /** Stable slot assignment: first pickup fills slot 0, next new type fills next empty slot (order does not reshuffle). */
  const [hotbarSlots, setHotbarSlots] = useState<(DroppedBlockItem["material"] | null)[]>(() =>
    Array.from({ length: hotbarSlotCount }, () => null),
  );

  const {
    removedTerrainBlockKeys,
    setRemovedTerrainBlockKeys,
    placedTerrainBlocks,
    setPlacedTerrainBlocks,
    placedTerrainBlocksRef,
    getOccupancySnapshot,
  } = useTerrainOccupancy();

  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const worldCanvasElRef = useRef<HTMLCanvasElement | null>(null);

  const requestWorldPointerLock = useCallback(() => {
    worldCanvasElRef.current?.requestPointerLock();
  }, []);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const handlePointerLockGained = useCallback(() => {
    setLocked(true);
    setHasEnteredWorldThisSession(true);
  }, []);

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

  const triggerTerrainImpact = useCallback(() => {
    setTerrainImpactTrigger((current) => current + 1);
  }, []);

  const triggerPlacementSwing = useCallback(() => {
    setPlaceSwingTick((current) => current + 1);
  }, []);

  const removeTerrainBlock = useCallback((block: BreakableTerrainHit) => {
    if (unbreakableTerrainMaterials.has(block.terrainMaterial)) return;

    if (placedTerrainBlocksRef.current.some((entry) => getTerrainBlockKey(entry.position) === block.blockKey)) {
      setPlacedTerrainBlocks((current) => current.filter((entry) => getTerrainBlockKey(entry.position) !== block.blockKey));
    } else {
      setRemovedTerrainBlockKeys((current) => {
        if (current.has(block.blockKey)) return current;
        return new Set(current).add(block.blockKey);
      });
    }

    const droppedMaterial =
      block.terrainMaterial === "wood"
        ? "wood"
        : block.terrainMaterial === "grass" || block.terrainMaterial === "grassShade" || block.terrainMaterial === "dirt"
          ? "dirt"
        : null;

    if (droppedMaterial) {
      setDroppedItems((current) => [
        ...current,
        (() => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.9 + Math.random() * 0.45;

          return {
            id: `${block.blockKey}-${current.length}-${Date.now()}`,
            material: droppedMaterial,
            blockPosition: block.blockPosition,
            spawnedAt: performance.now() / 1000,
            phase: Math.random() * Math.PI * 2,
            drift: [Math.cos(angle) * speed, Math.sin(angle) * speed] as [number, number],
          };
        })(),
      ]);
    }
  }, [placedTerrainBlocksRef, setPlacedTerrainBlocks, setRemovedTerrainBlockKeys]);

  const collectDroppedItem = useCallback((item: DroppedBlockItem) => {
    setDroppedItems((current) => current.filter((entry) => entry.id !== item.id));
    setCollectedInventory((current) => ({
      ...current,
      [item.material]: current[item.material] + 1,
    }));
    setHotbarSlots((slots) => {
      if (slots.some((s) => s === item.material)) return slots;
      const emptyIndex = slots.findIndex((s) => s === null);
      if (emptyIndex === -1) return slots;
      const next = [...slots];
      next[emptyIndex] = item.material;
      return next;
    });
  }, []);

  const placeTerrainBlock = useCallback(
    (material: DroppedBlockItem["material"], blockPosition: [number, number, number]) => {
      const blockKey = getTerrainBlockKey(blockPosition);
      const worldMaterial = material === "wood" ? "wood" : "dirt";

    setCollectedInventory((current) => {
      if (current[material] <= 0) return current;
        const nextCount = current[material] - 1;
        if (nextCount === 0) {
          setHotbarSlots((slots) => {
            const idx = slots.findIndex((s) => s === material);
            if (idx === -1) return slots;
            const nextSlots = [...slots];
            nextSlots[idx] = null;
            return nextSlots;
          });
        }
      return {
        ...current,
          [material]: nextCount,
      };
    });

    setPlacedTerrainBlocks((current) => {
        if (current.some((entry) => getTerrainBlockKey(entry.position) === blockKey)) return current;
      return [...current, { position: blockPosition, material: worldMaterial, solid: true }];
    });
    },
    [setPlacedTerrainBlocks],
  );

  useEffect(() => {
    const handleHotbarKeyDown = (event: KeyboardEvent) => {
      if (!locked || activePanel) return;
      if (!event.code.startsWith("Digit")) return;

      const nextSlot = Number(event.code.replace("Digit", "")) - 1;
      if (!Number.isInteger(nextSlot) || nextSlot < 0 || nextSlot >= hotbarSlotCount) return;

      event.preventDefault();
      setSelectedInventorySlot(nextSlot);
    };

    window.addEventListener("keydown", handleHotbarKeyDown);
    return () => window.removeEventListener("keydown", handleHotbarKeyDown);
  }, [activePanel, locked]);

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

  const selectedInventoryMaterial = hotbarSlots[selectedInventorySlot] ?? null;
  const heldInventoryMaterial = hoveredInventoryMaterial ?? selectedInventoryMaterial;
  const visibleTerrainBlocks = useMemo(
    () => composeVisibleTerrainBlocks(worldBlocks, removedTerrainBlockKeys, placedTerrainBlocks),
    [placedTerrainBlocks, removedTerrainBlockKeys],
  );

  const content = activePanel ? interactionContent[activePanel] : null;

  return (
    <div className="scene-shell">
      <Canvas
        camera={{ fov: 70 }}
        shadows
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        onCreated={({ gl }) => {
          worldCanvasElRef.current = gl.domElement as HTMLCanvasElement;
        }}
      >
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
        <DroppedBlockItems
          items={droppedItems}
          canCollect={locked && !activePanel}
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
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <BlockPlacementController
          enabled={locked && !activePanel}
          heldInventoryMaterial={heldInventoryMaterial}
          availableCount={heldInventoryMaterial ? collectedInventory[heldInventoryMaterial] : 0}
          onPlaceBlock={placeTerrainBlock}
          onPlaceSwing={triggerPlacementSwing}
          getOccupancySnapshot={getOccupancySnapshot}
        />
        <BillboardPhotoSign
          texturePath={spawnBillboardLayout.photo.texturePath}
          position={spawnBillboardLayout.photo.position}
          width={spawnBillboardLayout.photo.width}
          height={spawnBillboardLayout.photo.height}
        />
        <BillboardIntroText {...spawnBillboardLayout.introText} />
        <BillboardSocialSign
          label="LinkedIn"
          href={linkedinProfileUrl}
          texturePath="/textures/world/linkedin-logo.svg"
          position={spawnSocialPositions.linkedin}
          isActive={targetHref === linkedinProfileUrl}
        />
        <BillboardSocialSign
          label="Google Scholar"
          href={googleScholarProfileUrl}
          texturePath="/textures/world/google-scholar-logo.svg"
          position={spawnSocialPositions.googleScholar}
          isActive={targetHref === googleScholarProfileUrl}
        />
        <BillboardSocialSign
          label="GitHub"
          href={githubProfileUrl}
          texturePath="/textures/world/github-logo.svg"
          position={spawnSocialPositions.github}
          isActive={targetHref === githubProfileUrl}
        />
        <BillboardPublicationRow />
        {landmarks.map((landmark) => (
          <InteractableLandmark key={landmark.id} id={landmark.id} isActive={target === landmark.id} />
        ))}

        {(locked || heldInventoryMaterial) && !activePanel ? (
          <Hud renderPriority={1}>
            <PerspectiveCamera makeDefault position={[0, 0, 3.2]} fov={48} />
            <PlayerArmViewmodel
              moving={playerMoving}
              swingTick={armSwingTick}
              placeSwingTick={placeSwingTick}
              swingHeld={armSwingHeld}
              onSwingCycle={triggerTerrainImpact}
              heldInventoryMaterial={heldInventoryMaterial}
            />
          </Hud>
        ) : null}

        <PlayerController enabled={locked} onMovingChange={setPlayerMoving} getOccupancySnapshot={getOccupancySnapshot} />
        <InteractionRaycast onTarget={onTarget} />
        <ScenePointerLockControls onLock={handlePointerLockGained} onUnlock={handlePointerLockLost} />
      </Canvas>

      <GameWorldHud
        locked={locked}
        isPaused={!locked && hasEnteredWorldThisSession}
        onQuitToTitle={() => setHasEnteredWorldThisSession(false)}
        onRequestPointerLock={requestWorldPointerLock}
        activePanel={Boolean(activePanel)}
        targetLabel={targetLabel}
        hotbarSlots={hotbarSlots}
        selectedInventorySlot={selectedInventorySlot}
        collectedInventory={collectedInventory}
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
