import type { CubeFace } from "./types";
import { cubeFaceOrder } from "./types";

function resolveFaceTexturesArm(textures: {
  side?: string;
  top?: string;
  bottom?: string;
  right?: string;
  left?: string;
  front?: string;
  back?: string;
  all?: string;
}): Record<CubeFace, string> {
  const { all, side, top, bottom, right, left, front, back } = textures;
  const fallback = all ?? side ?? top ?? bottom;
  if (!fallback) throw new Error("Arm texture needs at least one path.");
  return {
    right: right ?? side ?? all ?? fallback,
    left: left ?? side ?? all ?? fallback,
    top: top ?? all ?? side ?? fallback,
    bottom: bottom ?? all ?? side ?? fallback,
    front: front ?? side ?? all ?? fallback,
    back: back ?? side ?? all ?? fallback,
  };
}

export const armTextureDefinitions = {
  skin: {
    side: "/textures/player/minecraft_arm_one_side.jpg",
    top: "/textures/player/minecraft_arm_top.png",
    bottom: "/textures/player/arm-skin-bottom.svg",
  },
  sleeve: {
    side: "/textures/player/arm-sleeve-side.svg",
    top: "/textures/player/arm-sleeve-top.svg",
    bottom: "/textures/player/arm-sleeve-bottom.svg",
  },
  cuff: {
    side: "/textures/player/arm-cuff-side.svg",
    top: "/textures/player/arm-cuff-top.svg",
    bottom: "/textures/player/arm-cuff-bottom.svg",
  },
} as const;

export const armRenderFlags = {
  sleeve: false,
  cuff: false,
} as const;

export const armFaceTexturePaths = Object.fromEntries(
  Object.entries(armTextureDefinitions).map(([key, textures]) => [
    key,
    resolveFaceTexturesArm(textures),
  ]),
) as Record<keyof typeof armTextureDefinitions, Record<CubeFace, string>>;

export const uniqueArmTexturePaths = Array.from(
  new Set(Object.values(armFaceTexturePaths).flatMap((facePaths) => cubeFaceOrder.map((face) => facePaths[face]))),
);
