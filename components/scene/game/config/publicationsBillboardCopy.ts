import type { Mesh } from "three";
import { Vector3 } from "three";
import { getCaretAtPoint } from "troika-three-text";

const PAPER_TITLE = "Neural Visibility Field for Uncertainty-Driven Active Mapping";

const AUTHORS_LINE =
  "Shangjie Xue, Jesse Dill, Pranay Mathur, Frank Dellaert, Panagiotis Tsiotras, Danfei Xu";

const VENUE_LINE = "IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR) 2024";

/** Body only (heading “Publications” is a separate `<Text>`). */
export const PUBLICATION_BODY_TEXT = `${PAPER_TITLE}
[Paper] [Website]
${AUTHORS_LINE}
${VENUE_LINE}`;

export type PublicationTextLink = {
  start: number;
  end: number;
  href: string;
  label: string;
};

export const PUBLICATION_TEXT_LINKS: PublicationTextLink[] = [
  {
    start: PUBLICATION_BODY_TEXT.indexOf("[Paper]"),
    end: PUBLICATION_BODY_TEXT.indexOf("[Paper]") + "[Paper]".length,
    href: "https://arxiv.org/pdf/2406.06948",
    label: "[Paper]",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("[Website]"),
    end: PUBLICATION_BODY_TEXT.indexOf("[Website]") + "[Website]".length,
    href: "https://sites.google.com/view/nvf-cvpr24/",
    label: "[Website]",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("Shangjie Xue"),
    end: PUBLICATION_BODY_TEXT.indexOf("Shangjie Xue") + "Shangjie Xue".length,
    href: "https://xsj01.github.io/",
    label: "Shangjie Xue",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("Pranay Mathur"),
    end: PUBLICATION_BODY_TEXT.indexOf("Pranay Mathur") + "Pranay Mathur".length,
    href: "https://matnay.github.io/",
    label: "Pranay Mathur",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("Frank Dellaert"),
    end: PUBLICATION_BODY_TEXT.indexOf("Frank Dellaert") + "Frank Dellaert".length,
    href: "https://dellaert.github.io/",
    label: "Frank Dellaert",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("Panagiotis Tsiotras"),
    end: PUBLICATION_BODY_TEXT.indexOf("Panagiotis Tsiotras") + "Panagiotis Tsiotras".length,
    href: "https://ae.gatech.edu/directory/person/panagiotis-tsiotras",
    label: "Panagiotis Tsiotras",
  },
  {
    start: PUBLICATION_BODY_TEXT.indexOf("Danfei Xu"),
    end: PUBLICATION_BODY_TEXT.indexOf("Danfei Xu") + "Danfei Xu".length,
    href: "https://faculty.cc.gatech.edu/~danfei/",
    label: "Danfei Xu",
  },
];

const COLOR_BODY = 0xf8fafc;
const COLOR_LINK = 0x0865c9;

export function buildPublicationTextColorRanges(): Record<number, number> {
  const ranges: Record<number, number> = { 0: COLOR_BODY };
  const sorted = [...PUBLICATION_TEXT_LINKS].sort((a, b) => a.start - b.start);
  for (const link of sorted) {
    ranges[link.start] = COLOR_LINK;
    ranges[link.end] = COLOR_BODY;
  }
  return ranges;
}

export const PUBLICATION_TEXT_COLOR_RANGES = buildPublicationTextColorRanges();

type TroikaTextMesh = Mesh & {
  textRenderInfo?: {
    caretPositions: Float32Array;
  };
};

export function resolvePublicationTextLinkAtHit(mesh: TroikaTextMesh, worldPoint: Vector3): PublicationTextLink | null {
  const info = mesh.textRenderInfo;
  if (!info) return null;

  const local = mesh.worldToLocal(new Vector3().copy(worldPoint));
  const caret = getCaretAtPoint(info, local.x, local.y);
  if (!caret) return null;

  const i = Math.min(Math.max(caret.charIndex - 1, 0), PUBLICATION_BODY_TEXT.length - 1);
  for (const link of PUBLICATION_TEXT_LINKS) {
    if (i >= link.start && i < link.end) return link;
  }
  return null;
}
