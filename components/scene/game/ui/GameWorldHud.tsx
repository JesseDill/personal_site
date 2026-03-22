"use client";

import { hotbarSlotCount } from "../config/inventory";
import type { DroppedBlockItem } from "../types";
import { InventoryVoxelIcon } from "./InventoryVoxelIcon";
import { MinecraftPauseMenu, MinecraftTitleScreen } from "./MinecraftGameMenus";

type GameWorldHudProps = {
  locked: boolean;
  /** True after the player has entered the world at least once this session and is now unlocked (Esc). */
  isPaused: boolean;
  onQuitToTitle: () => void;
  /** Same user gesture as Enter / Back — must call `canvas.requestPointerLock()` (Drei’s selector wiring can miss the HUD). */
  onRequestPointerLock: () => void;
  activePanel: boolean;
  targetLabel: string | null;
  crosshairScreenPosition?: { x: number; y: number } | null;
  /** After true, camera follows mouse — show classic + crosshair; before that, show MC-style pointer while look is frozen. */
  spawnLookUnlocked: boolean;
  /** Optional image for spawn pointer; `null` uses the built-in SVG. Use a `/…` path into `public/`. */
  spawnCursorImageSrc?: string | null;
  hotbarSlots: (DroppedBlockItem["material"] | null)[];
  selectedInventorySlot: number;
  collectedInventory: Record<DroppedBlockItem["material"], number>;
  onSelectSlot: (index: number, material: DroppedBlockItem["material"] | null) => void;
  onHoverMaterial: (material: DroppedBlockItem["material"]) => void;
  onSlotMouseLeave: (material: DroppedBlockItem["material"]) => void;
};

export function GameWorldHud({
  locked,
  isPaused,
  onQuitToTitle,
  onRequestPointerLock,
  activePanel,
  targetLabel,
  crosshairScreenPosition,
  spawnLookUnlocked,
  spawnCursorImageSrc = null,
  hotbarSlots,
  selectedInventorySlot,
  collectedInventory,
  onSelectSlot,
  onHoverMaterial,
  onSlotMouseLeave,
}: GameWorldHudProps) {
  const aimStyle = crosshairScreenPosition
    ? { left: `${crosshairScreenPosition.x}px`, top: `${crosshairScreenPosition.y}px` }
    : undefined;
  const tooltipOffsetY = !spawnLookUnlocked ? 20 : 22;
  const tooltipStyle = crosshairScreenPosition
    ? { left: `${crosshairScreenPosition.x}px`, top: `${crosshairScreenPosition.y + tooltipOffsetY}px` }
    : undefined;

  return (
    <div className="hud">
      {!locked && !isPaused ? (
        <MinecraftTitleScreen activePanel={activePanel} onRequestPointerLock={onRequestPointerLock} />
      ) : null}
      {!locked && isPaused ? (
        <MinecraftPauseMenu
          activePanel={activePanel}
          onQuitToTitle={onQuitToTitle}
          onRequestPointerLock={onRequestPointerLock}
        />
      ) : null}

      {locked && crosshairScreenPosition ? (
        <div
          className={`hud-aim-layer ${spawnLookUnlocked ? "hud-aim-layer--look" : "hud-aim-layer--spawn"}`}
          style={aimStyle}
          aria-hidden="true"
        >
          <div className="mc-spawn-pointer">
            {spawnCursorImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- HUD texture from `public/` or remote URL
              <img
                src={spawnCursorImageSrc}
                alt=""
                width={32}
                height={32}
                className="mc-spawn-pointer-img"
                draggable={false}
              />
            ) : (
              <svg className="mc-spawn-pointer-svg" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
                <path
                  d="M1 1v11l4-4 3 7 2-1-3-7h6V4H8L6 1z"
                  fill="#e8e8e8"
                  stroke="#1e1e1e"
                  strokeWidth="1"
                  strokeLinejoin="miter"
                />
              </svg>
            )}
          </div>
          <div className="crosshair-cross" />
        </div>
      ) : null}

      {/* Hover label from `InteractionRaycast` → colors: `app/globals.css` :root `--interaction-tooltip-*` */}
      {targetLabel && locked ? (
        <div className="tooltip" style={tooltipStyle}>
          {targetLabel}
        </div>
      ) : null}

      <section
        className={`collected-inventory${isPaused ? " collected-inventory--pause-front" : ""}`}
        aria-label="Collected block inventory"
        data-ui-layer="true"
      >
        <p className="collected-inventory-title">Collected</p>
        <div className="collected-inventory-grid">
          {Array.from({ length: hotbarSlotCount }, (_, index) => {
            const material = hotbarSlots[index] ?? null;

            return (
              <div
                key={material ?? `empty-slot-${index}`}
                className={`collected-slot${selectedInventorySlot === index ? " selected" : ""}`}
                aria-selected={selectedInventorySlot === index}
                onClick={() => {
                  onSelectSlot(index, material);
                }}
                onMouseEnter={() => {
                  if (material) onHoverMaterial(material);
                }}
                onMouseLeave={() => {
                  if (material) onSlotMouseLeave(material);
                }}
              >
                {material ? (
                  <>
                    <InventoryVoxelIcon material={material} />
                    <span className="collected-slot-count">{collectedInventory[material]}</span>
                  </>
                ) : (
                  <span className="collected-slot-empty" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
