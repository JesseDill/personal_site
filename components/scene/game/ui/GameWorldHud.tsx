"use client";

import { hotbarSlotCount } from "../config/inventory";
import type { DroppedBlockItem } from "../types";
import { InventoryVoxelIcon } from "./InventoryVoxelIcon";

type GameWorldHudProps = {
  locked: boolean;
  activePanel: boolean;
  targetLabel: string | null;
  visibleInventoryMaterials: DroppedBlockItem["material"][];
  selectedInventorySlot: number;
  collectedInventory: Record<DroppedBlockItem["material"], number>;
  onSelectSlot: (index: number, material: DroppedBlockItem["material"] | null) => void;
  onHoverMaterial: (material: DroppedBlockItem["material"]) => void;
  onSlotMouseLeave: (material: DroppedBlockItem["material"]) => void;
};

export function GameWorldHud({
  locked,
  activePanel,
  targetLabel,
  visibleInventoryMaterials,
  selectedInventorySlot,
  collectedInventory,
  onSelectSlot,
  onHoverMaterial,
  onSlotMouseLeave,
}: GameWorldHudProps) {
  return (
    <div className="hud">
      {!locked ? (
        <section className="status-card" data-ui-layer="true" aria-label="World controls">
          <p className="eyebrow">Voxel portfolio prototype</p>
          <h1 className="title">Portfolio Craft</h1>
          <p className="subtitle">
            Explore a handcrafted block world, aim at a landmark, and click to open the matching section.
          </p>
          <button
            id="enter-world"
            type="button"
            className="enter-world"
            disabled={locked || activePanel}
            aria-describedby="world-controls"
          >
            {locked ? "Exploring" : activePanel ? "Close Panel To Re-enter" : "Enter World"}
          </button>
          <p id="world-controls" className="locked-hint">
            {locked
              ? "WASD to move, Space to jump. Left click to mine and right click to place the selected block. Press ESC to free the cursor."
              : "Cursor unlocked. Enter the world to explore the interactive blocks."}
          </p>
        </section>
      ) : null}

      <div className="crosshair" aria-hidden="true" />

      {targetLabel && locked ? <div className="tooltip">{targetLabel}</div> : null}

      <section className="collected-inventory" aria-label="Collected block inventory" data-ui-layer="true">
        <p className="collected-inventory-title">Collected</p>
        <div className="collected-inventory-grid">
          {Array.from({ length: hotbarSlotCount }, (_, index) => {
            const material = visibleInventoryMaterials[index] ?? null;

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

      {!locked ? (
        <div className="quick-links" data-ui-layer="true">
          <a href="#fallback">Skip 3D / Open standard site</a>
          <a href="mailto:hello@example.com">Contact</a>
        </div>
      ) : null}
    </div>
  );
}
