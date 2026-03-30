import type { DroppedBlockItem, InventorySlot } from "../types";

export type InventoryArea = "main" | "hotbar";

export type InventorySlotsState = {
  mainInventorySlots: InventorySlot[];
  hotbarSlots: InventorySlot[];
  cursorItem: InventorySlot;
};

function cloneSlots<T>(arr: T[]): T[] {
  return [...arr];
}

function getSlot(
  state: InventorySlotsState,
  area: InventoryArea,
  index: number,
): InventorySlot {
  return area === "hotbar" ? state.hotbarSlots[index] : state.mainInventorySlots[index];
}

function setSlot(
  state: InventorySlotsState,
  area: InventoryArea,
  index: number,
  value: InventorySlot,
): InventorySlotsState {
  if (area === "hotbar") {
    const hotbarSlots = cloneSlots(state.hotbarSlots);
    hotbarSlots[index] = value;
    return { ...state, hotbarSlots };
  }
  const mainInventorySlots = cloneSlots(state.mainInventorySlots);
  mainInventorySlots[index] = value;
  return { ...state, mainInventorySlots };
}

/**
 * Minecraft-style inventory slot click (left = full stack moves, right = half / one).
 */
export function applyInventorySlotClick(
  state: InventorySlotsState,
  area: InventoryArea,
  index: number,
  button: "left" | "right",
  stackLimit: number,
): InventorySlotsState {
  const slot = getSlot(state, area, index);
  const cursor = state.cursorItem;

  if (button === "left") {
    if (!cursor) {
      if (!slot) return state;
      return {
        ...setSlot(state, area, index, null),
        cursorItem: { material: slot.material, count: slot.count },
      };
    }
    if (!slot) {
      return {
        ...setSlot(state, area, index, { material: cursor.material, count: cursor.count }),
        cursorItem: null,
      };
    }
    if (slot.material === cursor.material) {
      const space = stackLimit - slot.count;
      const move = Math.min(space, cursor.count);
      if (move <= 0) return state;
      const newSlot: InventorySlot = { material: slot.material, count: slot.count + move };
      const rest = cursor.count - move;
      return {
        ...setSlot(state, area, index, newSlot),
        cursorItem: rest > 0 ? { material: cursor.material, count: rest } : null,
      };
    }
    return {
      ...setSlot(state, area, index, { material: cursor.material, count: cursor.count }),
      cursorItem: { material: slot.material, count: slot.count },
    };
  }

  // right-click
  if (!cursor) {
    if (!slot) return state;
    const pick = Math.ceil(slot.count / 2);
    const remain = slot.count - pick;
    return {
      ...setSlot(state, area, index, remain > 0 ? { material: slot.material, count: remain } : null),
      cursorItem: { material: slot.material, count: pick },
    };
  }
  if (!slot) {
    if (cursor.count <= 1) {
      return {
        ...setSlot(state, area, index, { material: cursor.material, count: 1 }),
        cursorItem: null,
      };
    }
    return {
      ...setSlot(state, area, index, { material: cursor.material, count: 1 }),
      cursorItem: { material: cursor.material, count: cursor.count - 1 },
    };
  }
  if (slot.material === cursor.material && slot.count < stackLimit) {
    return {
      ...setSlot(state, area, index, { material: slot.material, count: slot.count + 1 }),
      cursorItem: cursor.count <= 1 ? null : { material: cursor.material, count: cursor.count - 1 },
    };
  }
  return {
    ...setSlot(state, area, index, { material: cursor.material, count: cursor.count }),
    cursorItem: { material: slot.material, count: slot.count },
  };
}

/**
 * Add a single item to hotbar (merge / first empty) then main inventory. Returns null if completely full.
 */
export function tryAddOneItem(
  hotbarSlots: InventorySlot[],
  mainInventorySlots: InventorySlot[],
  material: DroppedBlockItem["material"],
  stackLimit: number,
): { hotbarSlots: InventorySlot[]; mainInventorySlots: InventorySlot[] } | null {
  const mergeIn = (slots: InventorySlot[]): InventorySlot[] | null => {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.material === material && s.count < stackLimit) {
        const next = [...slots];
        next[i] = { material, count: s.count + 1 };
        return next;
      }
    }
    return null;
  };

  const hb1 = mergeIn(hotbarSlots);
  if (hb1) return { hotbarSlots: hb1, mainInventorySlots };

  const m1 = mergeIn(mainInventorySlots);
  if (m1) return { hotbarSlots, mainInventorySlots: m1 };

  const emptyHotbar = hotbarSlots.findIndex((s) => s === null);
  if (emptyHotbar >= 0) {
    const next = [...hotbarSlots];
    next[emptyHotbar] = { material, count: 1 };
    return { hotbarSlots: next, mainInventorySlots };
  }

  const emptyMain = mainInventorySlots.findIndex((s) => s === null);
  if (emptyMain >= 0) {
    const next = [...mainInventorySlots];
    next[emptyMain] = { material, count: 1 };
    return { hotbarSlots, mainInventorySlots: next };
  }

  return null;
}

/** Add many items one by one; leftover count is returned if inventory fills. */
export function tryAddItemCount(
  hotbarSlots: InventorySlot[],
  mainInventorySlots: InventorySlot[],
  material: DroppedBlockItem["material"],
  count: number,
  stackLimit: number,
): {
  hotbarSlots: InventorySlot[];
  mainInventorySlots: InventorySlot[];
  leftover: number;
} {
  let hb = hotbarSlots;
  let main = mainInventorySlots;
  let remaining = count;
  while (remaining > 0) {
    const next = tryAddOneItem(hb, main, material, stackLimit);
    if (!next) break;
    hb = next.hotbarSlots;
    main = next.mainInventorySlots;
    remaining -= 1;
  }
  return { hotbarSlots: hb, mainInventorySlots: main, leftover: remaining };
}
