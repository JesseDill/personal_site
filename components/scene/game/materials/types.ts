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
  /** When set, multiplies a neutral white face texture to a flat tint (good for calm “paper” boards). */
  solidColor?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  /** Render with a light-independent material so world lighting/shadows do not change its appearance. */
  unlit?: boolean;
  transparent?: boolean;
  alphaTest?: number;
};

export const cubeFaceOrder = ["right", "left", "top", "bottom", "front", "back"] as const;
export type CubeFace = (typeof cubeFaceOrder)[number];

export type VoxelMaterialPalette = Record<WorldMaterial, MaterialDefinition>;
