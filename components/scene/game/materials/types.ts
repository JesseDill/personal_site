import type { WorldMaterial } from "@/data/world";

export type MaterialDefinition = {
  textures: {
    all?: string;
    side?: string;
    top?: string;
    bottom?: string;
    right?: string;
    left?: string;
    front?: string;
    back?: string;
  };
  uiColor: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  alphaTest?: number;
};

export const cubeFaceOrder = ["right", "left", "top", "bottom", "front", "back"] as const;
export type CubeFace = (typeof cubeFaceOrder)[number];

export type VoxelMaterialPalette = Record<WorldMaterial, MaterialDefinition>;
