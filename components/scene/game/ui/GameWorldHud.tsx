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
  hotbarSlots,
  selectedInventorySlot,
  collectedInventory,
  onSelectSlot,
  onHoverMaterial,
  onSlotMouseLeave,
}: GameWorldHudProps) {
  const crosshairStyle = crosshairScreenPosition
    ? { left: `${crosshairScreenPosition.x}px`, top: `${crosshairScreenPosition.y}px` }
    : undefined;
  const tooltipStyle = crosshairScreenPosition
    ? { left: `${crosshairScreenPosition.x}px`, top: `${crosshairScreenPosition.y + 22}px` }
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

      <div className={`crosshair${!locked ? " crosshair--hidden" : ""}`} style={crosshairStyle} aria-hidden="true" />

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
