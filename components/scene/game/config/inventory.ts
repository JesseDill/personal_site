import type { InventoryMaterial } from "../types";
import { faceTexturePaths } from "../materials/voxelMaterialPalette";
import { cubeFaceOrder } from "../materials/types";
import { assetPath } from "@/lib/assetPrefix";

/** How an item is drawn in HUD icon, dropped-item mesh, and first-person hand. */
export type InventoryItemRenderKind = "voxelCube" | "slab" | "stair" | "fence" | "door";

export type CollectedInventoryItemConfig = {
  label: string;
  renderKind: InventoryItemRenderKind;
  /** Six face texture paths for `voxelCube`; ignored for fixture kinds. */
  faceTextures?: string[];
  /** Primary texture for slab/stair/fence; door uses dedicated art. */
  texturePath?: string;
};

const woodPlanksFaces = cubeFaceOrder.map((face) => faceTexturePaths.woodPlanks[face]);
const doorPath = assetPath("/textures/world/door.svg");

export const collectedInventoryConfig = {
  dirt: {
    label: "Dirt",
    renderKind: "voxelCube",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.dirt[face]),
  },
  wood: {
    label: "Log",
    renderKind: "voxelCube",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.wood[face]),
  },
  woodPlanks: {
    label: "Planks",
    renderKind: "voxelCube",
    faceTextures: woodPlanksFaces,
  },
  woodenSlab: {
    label: "Wood Slab",
    renderKind: "slab",
    texturePath: assetPath("/textures/world/wood-planks.svg"),
  },
  woodenStair: {
    label: "Wood Stairs",
    renderKind: "stair",
    texturePath: assetPath("/textures/world/wood-planks.svg"),
  },
  woodenFence: {
    label: "Wood Fence",
    renderKind: "fence",
    texturePath: assetPath("/textures/world/wood-planks.svg"),
  },
  woodenDoor: {
    label: "Wood Door",
    renderKind: "door",
    texturePath: doorPath,
  },
} satisfies Record<InventoryMaterial, CollectedInventoryItemConfig>;

export const collectedInventoryMaterials = Object.keys(collectedInventoryConfig) as InventoryMaterial[];

export const hotbarSlotCount = 9;

export const mainInventorySlotCount = 27;

/** Max items per stack (Minecraft-style). */
export const inventoryStackLimit = 64;

/** All texture URLs needed for previews and drops (deduped). */
export const hotbarPreviewTexturePaths = Array.from(
  new Set(
    collectedInventoryMaterials.flatMap((material) => {
      const c = collectedInventoryConfig[material];
      if (c.renderKind === "voxelCube" && c.faceTextures) {
        return c.faceTextures;
      }
      if ("texturePath" in c && c.texturePath) return [c.texturePath];
      return [];
    }),
  ),
);
