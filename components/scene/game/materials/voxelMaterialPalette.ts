import type { WorldMaterial } from "@/data/world";
import type { CubeFace, MaterialDefinition, VoxelMaterialPalette } from "./types";
import { cubeFaceOrder } from "./types";

function resolveFaceTextures(material: MaterialDefinition): Record<CubeFace, string> {
  const { all, side, top, bottom, right, left, front, back } = material.textures;
  const fallback = all ?? side ?? top ?? bottom;

  if (!fallback) {
    throw new Error("Every material needs at least one texture.");
  }

  return {
    right: right ?? side ?? all ?? fallback,
    left: left ?? side ?? all ?? fallback,
    top: top ?? all ?? side ?? fallback,
    bottom: bottom ?? all ?? side ?? fallback,
    front: front ?? side ?? all ?? fallback,
    back: back ?? side ?? all ?? fallback,
  };
}

export const voxelMaterialPalette = {
  grass: {
    textures: {
      top: "/textures/world/grass-top.svg",
      bottom: "/textures/world/dirt.svg",
      side: "/textures/world/grass-side.svg",
    },
    uiColor: "#7c9f50",
    roughness: 1,
  },
  grassShade: {
    textures: {
      top: "/textures/world/grass-shade-top.svg",
      bottom: "/textures/world/dirt.svg",
      side: "/textures/world/grass-shade-side.svg",
    },
    uiColor: "#6a8b45",
    roughness: 1,
  },
  dirt: { textures: { all: "/textures/world/dirt.svg" }, uiColor: "#8b6541", roughness: 1 },
  bedrock: { textures: { all: "/textures/world/bedrock.svg" }, uiColor: "#52565c", roughness: 1 },
  signStone: { textures: { all: "/textures/world/sign-stone.svg" }, uiColor: "#8b8f98", roughness: 0.92 },
  path: { textures: { all: "/textures/world/path.svg" }, uiColor: "#b89b6f", roughness: 0.96 },
  stone: { textures: { all: "/textures/world/stone.svg" }, uiColor: "#9f9380", roughness: 1 },
  stoneDark: { textures: { all: "/textures/world/stone-dark.svg" }, uiColor: "#5f5a54", roughness: 1 },
  wood: {
    textures: {
      top: "/textures/world/log-top.svg",
      bottom: "/textures/world/log-top.svg",
      side: "/textures/world/log-side.svg",
    },
    uiColor: "#8e6438",
    roughness: 0.95,
  },
  leaves: {
    textures: { all: "/textures/world/leaves.svg" },
    uiColor: "#4d7940",
    roughness: 1,
    transparent: true,
    alphaTest: 0.5,
  },
  aboutAccent: {
    textures: { all: "/textures/world/about-accent.svg" },
    uiColor: "#f0d476",
    roughness: 0.8,
    emissive: "#f0d476",
    emissiveIntensity: 0.1,
  },
  resumeAccent: {
    textures: { all: "/textures/world/resume-accent.svg" },
    uiColor: "#79d9ff",
    roughness: 0.7,
    emissive: "#79d9ff",
    emissiveIntensity: 0.12,
  },
  projectsAccent: {
    textures: { all: "/textures/world/projects-accent.svg" },
    uiColor: "#f6b44d",
    roughness: 0.75,
    emissive: "#f6b44d",
    emissiveIntensity: 0.1,
  },
  researchAccent: {
    textures: { all: "/textures/world/research-accent.svg" },
    uiColor: "#9bd77a",
    roughness: 0.8,
    emissive: "#9bd77a",
    emissiveIntensity: 0.09,
  },
  contactAccent: {
    textures: { all: "/textures/world/contact-accent.svg" },
    uiColor: "#7de4d0",
    roughness: 0.75,
    emissive: "#7de4d0",
    emissiveIntensity: 0.14,
  },
  cloud: { textures: { all: "/textures/world/cloud.svg" }, uiColor: "#f8fafc", roughness: 1, metalness: 0.02 },
} satisfies VoxelMaterialPalette;

export const faceTexturePaths = Object.fromEntries(
  (Object.entries(voxelMaterialPalette) as [WorldMaterial, MaterialDefinition][]).map(([key, material]) => [
    key,
    resolveFaceTextures(material),
  ]),
) as Record<WorldMaterial, Record<CubeFace, string>>;

export const uniqueVoxelTexturePaths = Array.from(
  new Set(Object.values(faceTexturePaths).flatMap((facePaths) => cubeFaceOrder.map((face) => facePaths[face]))),
);
