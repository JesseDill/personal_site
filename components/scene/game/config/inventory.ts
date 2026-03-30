import type { DroppedBlockItem } from "../types";
import { faceTexturePaths } from "../materials/voxelMaterialPalette";
import { cubeFaceOrder } from "../materials/types";

export const collectedInventoryConfig = {
  dirt: {
    label: "Dirt",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.dirt[face]),
  },
  wood: {
    label: "Log",
    faceTextures: cubeFaceOrder.map((face) => faceTexturePaths.wood[face]),
  },
} satisfies Record<DroppedBlockItem["material"], { label: string; faceTextures: string[] }>;

export const collectedInventoryMaterials = Object.keys(collectedInventoryConfig) as DroppedBlockItem["material"][];

export const hotbarSlotCount = 9;

export const mainInventorySlotCount = 27;

/** Max items per stack (Minecraft-style). */
export const inventoryStackLimit = 64;

export const hotbarPreviewTexturePaths = Array.from(
  new Set(collectedInventoryMaterials.flatMap((material) => collectedInventoryConfig[material].faceTextures)),
);
