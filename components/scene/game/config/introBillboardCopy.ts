import type { Mesh } from "three";
import { Vector3 } from "three";
import { getCaretAtPoint } from "troika-three-text";

/** Full string passed to troika `Text` (single source for layout, colors, and hit-testing). */
export const INTRO_BILLBOARD_TEXT = `Hi, I'm Jesse! \n
Currently, I'm a software engineer under the Road Understanding Team at Waymo, iterating on online mapping systems.

Previously, I studied computer science at Georgia Tech, where I had the privilege of working with Danfei Xu as part of the Robot Learning and Reasoning Lab (RL2).

Largely, I'm interested in the intersection of robotics, vision, and graphics.`;

export type IntroTextLink = {
  start: number;
  end: number;
  href: string;
  label: string;
};

export const INTRO_TEXT_LINKS: IntroTextLink[] = [
  {
    start: INTRO_BILLBOARD_TEXT.indexOf("Danfei Xu"),
    end: INTRO_BILLBOARD_TEXT.indexOf("Danfei Xu") + "Danfei Xu".length,
    href: "https://faculty.cc.gatech.edu/~danfei/",
    label: "Danfei Xu",
  },
  {
    start: INTRO_BILLBOARD_TEXT.indexOf("Robot Learning and Reasoning Lab (RL2)"),
    end:
      INTRO_BILLBOARD_TEXT.indexOf("Robot Learning and Reasoning Lab (RL2)") +
      "Robot Learning and Reasoning Lab (RL2)".length,
    href: "https://rl2.cc.gatech.edu/",
    label: "Robot Learning and Reasoning Lab (RL2)",
  },
];

/** `#RRGGBB` / `#RGB` → troika packed RGB integer. */
export function hexCssToTroikaInt(hex: string): number {
  const n = hex.trim().replace(/^#/, "");
  if (n.length === 3) {
    const r = parseInt(n[0] + n[0], 16);
    const g = parseInt(n[1] + n[1], 16);
    const b = parseInt(n[2] + n[2], 16);
    return (r << 16) | (g << 8) | b;
  }
  if (n.length === 6) return parseInt(n, 16);
  return 0xffffff;
}

/**
 * Troika `colorRanges`: at each key index, color applies from that character until the next key.
 */
export function buildIntroTextColorRanges(
  bodyHex = "#f8fafc",
  linkHex = "#0865c9",
): Record<number, number> {
  const body = hexCssToTroikaInt(bodyHex);
  const link = hexCssToTroikaInt(linkHex);
  const ranges: Record<number, number> = { 0: body };
  const sorted = [...INTRO_TEXT_LINKS].sort((a, b) => a.start - b.start);
  for (const l of sorted) {
    ranges[l.start] = link;
    ranges[l.end] = body;
  }
  return ranges;
}

export const INTRO_TEXT_COLOR_RANGES = buildIntroTextColorRanges();

type TroikaTextMesh = Mesh & {
  textRenderInfo?: {
    caretPositions: Float32Array;
  };
};

export function resolveIntroTextLinkAtHit(mesh: TroikaTextMesh, worldPoint: Vector3): IntroTextLink | null {
  const info = mesh.textRenderInfo;
  if (!info) return null;

  const local = mesh.worldToLocal(new Vector3().copy(worldPoint));
  const caret = getCaretAtPoint(info, local.x, local.y);
  if (!caret) return null;

  const i = Math.min(Math.max(caret.charIndex - 1, 0), INTRO_BILLBOARD_TEXT.length - 1);
  for (const link of INTRO_TEXT_LINKS) {
    if (i >= link.start && i < link.end) return link;
  }
  return null;
}
