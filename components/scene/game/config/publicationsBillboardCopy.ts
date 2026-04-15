import type { Mesh } from "three";
import { Vector3 } from "three";
import { getCaretAtPoint } from "troika-three-text";
import { hexCssToTroikaInt } from "./introBillboardCopy";

const GAVIS_TITLE =
  "Uncertainty-driven 3D Gaussian Splatting Active Mapping via Anisotropic Visibility Field";

const GAVIS_AUTHORS =
  "Shangjie Xue*, Jesse Dill*, Dhruv Ahuja*, Frank Dellaert, Panagiotis Tsiotras, Danfei Xu";

const GAVIS_EQUAL = "(*Equal contribution)";
const GAVIS_VENUE = "CVPR 2026";

const NVF_TITLE = "Neural Visibility Field for Uncertainty-Driven Active Mapping";

const NVF_AUTHORS_LINE =
  "Shangjie Xue, Jesse Dill, Pranay Mathur, Frank Dellaert, Panagiotis Tsiotras, Danfei Xu";

const NVF_VENUE_LINE = "CVPR 2024";

const GAVIS_BLOCK = `${GAVIS_TITLE}
[Paper] [Website]
${GAVIS_AUTHORS}
${GAVIS_EQUAL}
${GAVIS_VENUE}`;

const NVF_BLOCK = `${NVF_TITLE}
[Paper] [Website]
${NVF_AUTHORS_LINE}
${NVF_VENUE_LINE}`;

/** Body only (heading “Publications” is a separate `<Text>`). GAVIS (CVPR 2026) first, then NVF (CVPR 2024). */
export const PUBLICATION_BODY_TEXT = `${GAVIS_BLOCK}

${NVF_BLOCK}`;

/** Per-paper text blocks for use in the fallback HTML where each paper needs its own section. */
export const GAVIS_BODY_TEXT = GAVIS_BLOCK;
export const NVF_BODY_TEXT = NVF_BLOCK;

export type PublicationTextLink = {
  start: number;
  end: number;
  href: string;
  label: string;
};

function publicationLinksFromBody(text: string): PublicationTextLink[] {
  const links: PublicationTextLink[] = [];

  const firstPaper = text.indexOf("[Paper]");
  const secondPaper = text.indexOf("[Paper]", firstPaper + 1);
  const firstWebsite = text.indexOf("[Website]");
  const secondWebsite = text.indexOf("[Website]", firstWebsite + 1);

  const firstShangjie = text.indexOf("Shangjie Xue");
  const secondShangjie = text.indexOf("Shangjie Xue", firstShangjie + 1);

  const firstFrank = text.indexOf("Frank Dellaert");
  const secondFrank = text.indexOf("Frank Dellaert", firstFrank + 1);

  const firstPanagiotis = text.indexOf("Panagiotis Tsiotras");
  const secondPanagiotis = text.indexOf("Panagiotis Tsiotras", firstPanagiotis + 1);

  const firstDanfei = text.indexOf("Danfei Xu");
  const secondDanfei = text.indexOf("Danfei Xu", firstDanfei + 1);

  // GAVIS
  links.push(
    {
      start: firstPaper,
      end: firstPaper + "[Paper]".length,
      href: "https://gatech-rl2.github.io/GAVIS/files/main.pdf",
      label: "[Paper]",
    },
    {
      start: firstWebsite,
      end: firstWebsite + "[Website]".length,
      href: "https://gatech-rl2.github.io/GAVIS/",
      label: "[Website]",
    },
    {
      start: firstShangjie,
      end: firstShangjie + "Shangjie Xue".length,
      href: "https://xsj01.github.io/",
      label: "Shangjie Xue",
    },
    {
      start: text.indexOf("Dhruv Ahuja"),
      end: text.indexOf("Dhruv Ahuja") + "Dhruv Ahuja".length,
      href: "https://www.linkedin.com/in/dhruvahuja8/",
      label: "Dhruv Ahuja",
    },
    {
      start: firstFrank,
      end: firstFrank + "Frank Dellaert".length,
      href: "https://dellaert.github.io/",
      label: "Frank Dellaert",
    },
    {
      start: firstPanagiotis,
      end: firstPanagiotis + "Panagiotis Tsiotras".length,
      href: "https://ae.gatech.edu/directory/person/panagiotis-tsiotras",
      label: "Panagiotis Tsiotras",
    },
    {
      start: firstDanfei,
      end: firstDanfei + "Danfei Xu".length,
      href: "https://faculty.cc.gatech.edu/~danfei/",
      label: "Danfei Xu",
    },
  );

  // NVF
  links.push(
    {
      start: secondPaper,
      end: secondPaper + "[Paper]".length,
      href: "https://arxiv.org/pdf/2406.06948",
      label: "[Paper]",
    },
    {
      start: secondWebsite,
      end: secondWebsite + "[Website]".length,
      href: "https://sites.google.com/view/nvf-cvpr24/",
      label: "[Website]",
    },
    {
      start: secondShangjie,
      end: secondShangjie + "Shangjie Xue".length,
      href: "https://xsj01.github.io/",
      label: "Shangjie Xue",
    },
    {
      start: text.indexOf("Pranay Mathur"),
      end: text.indexOf("Pranay Mathur") + "Pranay Mathur".length,
      href: "https://matnay.github.io/",
      label: "Pranay Mathur",
    },
    {
      start: secondFrank,
      end: secondFrank + "Frank Dellaert".length,
      href: "https://dellaert.github.io/",
      label: "Frank Dellaert",
    },
    {
      start: secondPanagiotis,
      end: secondPanagiotis + "Panagiotis Tsiotras".length,
      href: "https://ae.gatech.edu/directory/person/panagiotis-tsiotras",
      label: "Panagiotis Tsiotras",
    },
    {
      start: secondDanfei,
      end: secondDanfei + "Danfei Xu".length,
      href: "https://faculty.cc.gatech.edu/~danfei/",
      label: "Danfei Xu",
    },
  );

  return links;
}

export const PUBLICATION_TEXT_LINKS: PublicationTextLink[] = publicationLinksFromBody(PUBLICATION_BODY_TEXT);

function gavisLinksFromBody(text: string): PublicationTextLink[] {
  return [
    { start: text.indexOf("[Paper]"), end: text.indexOf("[Paper]") + "[Paper]".length, href: "https://gatech-rl2.github.io/GAVIS/files/main.pdf", label: "[Paper]" },
    { start: text.indexOf("[Website]"), end: text.indexOf("[Website]") + "[Website]".length, href: "https://gatech-rl2.github.io/GAVIS/", label: "[Website]" },
    { start: text.indexOf("Shangjie Xue"), end: text.indexOf("Shangjie Xue") + "Shangjie Xue".length, href: "https://xsj01.github.io/", label: "Shangjie Xue" },
    { start: text.indexOf("Dhruv Ahuja"), end: text.indexOf("Dhruv Ahuja") + "Dhruv Ahuja".length, href: "https://www.linkedin.com/in/dhruvahuja8/", label: "Dhruv Ahuja" },
    { start: text.indexOf("Frank Dellaert"), end: text.indexOf("Frank Dellaert") + "Frank Dellaert".length, href: "https://dellaert.github.io/", label: "Frank Dellaert" },
    { start: text.indexOf("Panagiotis Tsiotras"), end: text.indexOf("Panagiotis Tsiotras") + "Panagiotis Tsiotras".length, href: "https://ae.gatech.edu/directory/person/panagiotis-tsiotras", label: "Panagiotis Tsiotras" },
    { start: text.indexOf("Danfei Xu"), end: text.indexOf("Danfei Xu") + "Danfei Xu".length, href: "https://faculty.cc.gatech.edu/~danfei/", label: "Danfei Xu" },
  ];
}

function nvfLinksFromBody(text: string): PublicationTextLink[] {
  return [
    { start: text.indexOf("[Paper]"), end: text.indexOf("[Paper]") + "[Paper]".length, href: "https://arxiv.org/pdf/2406.06948", label: "[Paper]" },
    { start: text.indexOf("[Website]"), end: text.indexOf("[Website]") + "[Website]".length, href: "https://sites.google.com/view/nvf-cvpr24/", label: "[Website]" },
    { start: text.indexOf("Shangjie Xue"), end: text.indexOf("Shangjie Xue") + "Shangjie Xue".length, href: "https://xsj01.github.io/", label: "Shangjie Xue" },
    { start: text.indexOf("Pranay Mathur"), end: text.indexOf("Pranay Mathur") + "Pranay Mathur".length, href: "https://matnay.github.io/", label: "Pranay Mathur" },
    { start: text.indexOf("Frank Dellaert"), end: text.indexOf("Frank Dellaert") + "Frank Dellaert".length, href: "https://dellaert.github.io/", label: "Frank Dellaert" },
    { start: text.indexOf("Panagiotis Tsiotras"), end: text.indexOf("Panagiotis Tsiotras") + "Panagiotis Tsiotras".length, href: "https://ae.gatech.edu/directory/person/panagiotis-tsiotras", label: "Panagiotis Tsiotras" },
    { start: text.indexOf("Danfei Xu"), end: text.indexOf("Danfei Xu") + "Danfei Xu".length, href: "https://faculty.cc.gatech.edu/~danfei/", label: "Danfei Xu" },
  ];
}

export const GAVIS_TEXT_LINKS: PublicationTextLink[] = gavisLinksFromBody(GAVIS_BODY_TEXT);
export const NVF_TEXT_LINKS: PublicationTextLink[] = nvfLinksFromBody(NVF_BODY_TEXT);

export function buildPublicationTextColorRanges(
  bodyHex = "#f8fafc",
  linkHex = "#0865c9",
): Record<number, number> {
  const body = hexCssToTroikaInt(bodyHex);
  const link = hexCssToTroikaInt(linkHex);
  const ranges: Record<number, number> = { 0: body };
  const sorted = [...PUBLICATION_TEXT_LINKS].sort((a, b) => a.start - b.start);
  for (const l of sorted) {
    ranges[l.start] = link;
    ranges[l.end] = body;
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
