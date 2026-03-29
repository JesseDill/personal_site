"use client";

import Image from "next/image";
import { hotbarSlotCount } from "../config/inventory";
import type { DroppedBlockItem } from "../types";
import { InventoryVoxelIcon } from "./InventoryVoxelIcon";
import { MinecraftPauseMenu, MinecraftTitleScreen } from "./MinecraftGameMenus";

type HudIconState = "full" | "half" | "empty";

const hudIconTextures = {
  heart: {
    full: "/textures/UI/heart-full.svg",
    half: "/textures/UI/heart-half.svg",
    empty: "/textures/UI/heart-empty.svg",
  },
  hunger: {
    full: "/textures/UI/hunger-full.svg",
    half: "/textures/UI/hunger-half.svg",
    empty: "/textures/UI/hunger-empty.svg",
  },
} as const;

function buildHudIconStates(current: number, max: number, slotCount = 10): HudIconState[] {
  const normalizedMax = Math.max(max, 0);
  const normalizedCurrent = Math.min(Math.max(current, 0), normalizedMax);
  const pointsPerIcon = normalizedMax > 0 ? normalizedMax / slotCount : 0;

  return Array.from({ length: slotCount }, (_, index) => {
    const iconStart = index * pointsPerIcon;
    const iconEnd = iconStart + pointsPerIcon;

    if (normalizedCurrent >= iconEnd) return "full";
    if (normalizedCurrent > iconStart) return "half";
    return "empty";
  });
}

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
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  xpProgress: number;
  xpLevel: number;
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
  health,
  maxHealth,
  hunger,
  maxHunger,
  xpProgress,
  xpLevel,
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
  const heartStates = buildHudIconStates(health, maxHealth);
  const hungerStates = buildHudIconStates(hunger, maxHunger);
  const clampedXpProgress = Math.min(Math.max(xpProgress, 0), 1);

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

      <div className={`mc-hotbar-stack${isPaused ? " collected-inventory--pause-front" : ""}`} data-ui-layer="true">
        {locked ? (
          <div className="mc-status-bars" aria-label="Player status">
            <div className="mc-status-bars-row">
              <div className="mc-status-icons" aria-label={`Health ${health} out of ${maxHealth}`}>
                {heartStates.map((state, index) => (
                  <Image
                    key={`heart-${index}`}
                    src={hudIconTextures.heart[state]}
                    alt=""
                    width={18}
                    height={18}
                    className="mc-status-icon"
                    draggable={false}
                  />
                ))}
              </div>
              <div className="mc-status-icons mc-status-icons--hunger" aria-label={`Hunger ${hunger} out of ${maxHunger}`}>
                {hungerStates.map((state, index) => (
                  <Image
                    key={`hunger-${index}`}
                    src={hudIconTextures.hunger[state]}
                    alt=""
                    width={18}
                    height={18}
                    className="mc-status-icon"
                    draggable={false}
                  />
                ))}
              </div>
            </div>
            <div className="mc-xp-wrapper" aria-label={`Experience level ${xpLevel}`}>
              <div className="mc-xp-level">{xpLevel}</div>
              <div className="mc-xp-track" aria-hidden="true">
                <div className="mc-xp-fill" style={{ width: `${clampedXpProgress * 100}%` }} />
              </div>
            </div>
          </div>
        ) : null}
        <section className="collected-inventory" aria-label="Collected block inventory">
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
    </div>
  );
}
