import type { Mesh } from "three";
import { Vector3 } from "three";
import { getCaretAtPoint } from "troika-three-text";

/** Full string passed to troika `Text` (single source for layout, colors, and hit-testing). */
export const INTRO_BILLBOARD_TEXT = `Hi, I'm Jesse! \n
I'm a software engineer under the Road Understanding Team at Waymo, where we build representations that understand the driving elements around the vehicle.

Previously, I obtained my Masters's and Bachelor's degrees in Computer Science from Georgia Tech, where I had the privilege of working with Danfei Xu as part of the Robot Learning and Reasoning Lab (RL2)

Largely, I'm interested in the intersection of robotics, vision, and graphics`;

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

/** Body text (Google-Doc-style link blue on near-white background). */
const COLOR_BODY = 0xf8fafc;
const COLOR_LINK = 0x0865C9;
;

/**
 * Troika `colorRanges`: at each key index, color applies from that character until the next key.
 */
export function buildIntroTextColorRanges(): Record<number, number> {
  const ranges: Record<number, number> = { 0: COLOR_BODY };
  const sorted = [...INTRO_TEXT_LINKS].sort((a, b) => a.start - b.start);
  for (const link of sorted) {
    ranges[link.start] = COLOR_LINK;
    ranges[link.end] = COLOR_BODY;
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
