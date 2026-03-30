"use client";

import { useCallback, useState } from "react";
import { hotbarSlotCount, mainInventorySlotCount } from "../config/inventory";
import type { InventorySlot } from "../types";
import type { InventoryArea } from "../inventory/inventorySlotActions";
import { InventoryVoxelIcon } from "./InventoryVoxelIcon";

type MinecraftInventoryScreenProps = {
  mainInventorySlots: InventorySlot[];
  hotbarSlots: InventorySlot[];
  cursorItem: InventorySlot;
  selectedInventorySlot: number;
  onSelectHotbarSlot: (index: number) => void;
  onSlotClick: (area: InventoryArea, index: number, button: "left" | "right") => void;
  /** Clicked dimmed backdrop while holding cursor stack — drop items. */
  onDropCursorOnBackdrop: () => void;
};

function InventorySlotCell({
  slot,
  area,
  index,
  selected,
  onPointerDown,
}: {
  slot: InventorySlot;
  area: InventoryArea;
  index: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, area: InventoryArea, index: number) => void;
}) {
  return (
    <button
      type="button"
      data-inventory-slot="true"
      className={`mc-inventory-slot${selected ? " mc-inventory-slot--selected" : ""}`}
      aria-label={slot ? `${slot.count} items` : "Empty slot"}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, area, index);
      }}
    >
      {slot ? (
        <>
          <InventoryVoxelIcon material={slot.material} />
          <span className="mc-inventory-slot-count">{slot.count}</span>
        </>
      ) : null}
    </button>
  );
}

export function MinecraftInventoryScreen({
  mainInventorySlots,
  hotbarSlots,
  cursorItem,
  selectedInventorySlot,
  onSelectHotbarSlot,
  onSlotClick,
  onDropCursorOnBackdrop,
}: MinecraftInventoryScreenProps) {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDimPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== e.currentTarget) return;
      if (cursorItem) onDropCursorOnBackdrop();
    },
    [cursorItem, onDropCursorOnBackdrop],
  );

  const handleRootPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-inventory-slot="true"]')) return;
      if (cursorItem) onDropCursorOnBackdrop();
    },
    [cursorItem, onDropCursorOnBackdrop],
  );

  const handleSlotPointerDown = useCallback(
    (e: React.PointerEvent, area: InventoryArea, index: number) => {
      if (e.button !== 0 && e.button !== 2) return;
      const button = e.button === 2 ? "right" : "left";
      if (area === "hotbar") {
        onSelectHotbarSlot(index);
      }
      onSlotClick(area, index, button);
    },
    [onSelectHotbarSlot, onSlotClick],
  );

  return (
    <div
      className="mc-inventory-dim"
      role="presentation"
      onPointerMove={handlePointerMove}
      onPointerDown={handleDimPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="mc-inventory-root"
        role="dialog"
        aria-modal="true"
        aria-label="Inventory"
        onPointerDown={handleRootPointerDown}
      >
        <div className="mc-inventory-top-row">
          <div className="mc-inventory-armor" aria-hidden="true">
            <span className="mc-inventory-placeholder-label">Armor</span>
            <div className="mc-inventory-armor-slots">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={`armor-${i}`} className="mc-inventory-slot mc-inventory-slot--placeholder" />
              ))}
            </div>
          </div>
          <div className="mc-inventory-player-preview mc-inventory-placeholder">
            <span>Player</span>
            <span className="mc-inventory-placeholder-sub">Preview (later)</span>
          </div>
          <div className="mc-inventory-crafting" aria-hidden="true">
            <span className="mc-inventory-placeholder-label">Crafting</span>
            <div className="mc-inventory-crafting-inner">
              <div className="mc-inventory-crafting-grid">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={`craft-${i}`} className="mc-inventory-slot mc-inventory-slot--placeholder" />
                ))}
              </div>
              <span className="mc-inventory-crafting-arrow" aria-hidden="true">
                →
              </span>
              <div className="mc-inventory-slot mc-inventory-slot--placeholder" />
            </div>
          </div>
        </div>

        <p className="mc-inventory-hint">Press E or Esc to close. Right-click: half stack / place one.</p>

        <div className="mc-inventory-section-label">Inventory</div>
        <div
          className="mc-inventory-grid mc-inventory-grid--main"
          style={{ gridTemplateColumns: `repeat(9, var(--mc-inv-slot-size))` }}
        >
          {Array.from({ length: mainInventorySlotCount }, (_, index) => (
            <InventorySlotCell
              key={`main-${index}`}
              slot={mainInventorySlots[index] ?? null}
              area="main"
              index={index}
              selected={false}
              onPointerDown={handleSlotPointerDown}
            />
          ))}
        </div>

        <div className="mc-inventory-section-label">Hotbar</div>
        <div
          className="mc-inventory-grid mc-inventory-grid--hotbar"
          style={{ gridTemplateColumns: `repeat(${hotbarSlotCount}, var(--mc-inv-slot-size))` }}
        >
          {Array.from({ length: hotbarSlotCount }, (_, index) => (
            <InventorySlotCell
              key={`hotbar-${index}`}
              slot={hotbarSlots[index] ?? null}
              area="hotbar"
              index={index}
              selected={selectedInventorySlot === index}
              onPointerDown={handleSlotPointerDown}
            />
          ))}
        </div>
      </div>

      {cursorItem ? (
        <div
          className="mc-inventory-cursor-item"
          style={{ left: cursorPos.x, top: cursorPos.y }}
          aria-hidden="true"
        >
          <InventoryVoxelIcon material={cursorItem.material} />
          <span className="mc-inventory-slot-count">{cursorItem.count}</span>
        </div>
      ) : null}
    </div>
  );
}
