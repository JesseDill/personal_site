/**
 * Single place to tune spawn-wall billboards (photo, intro copy, publications, social row).
 * Social Y is derived from the photo anchor so the row sits just under the portrait.
 *
 * `photo.width` / `photo.height` are passed to `BillboardPhotoSign` (world units on the wall plane).
 * Must match `BillboardSocialSign` signFaceSize (0.45) for `SOCIAL_HALF_Y` below.
 */
const SOCIAL_HALF_Y = 0.225;

/** Typography for `BillboardIntroText` (drei `Text` / troika). */
export type IntroTextLayout = {
  position: [number, number, number];
  fontSize: number;
  maxWidth: number;
  lineHeight: number;
  outlineWidth: number;
  /** Main paragraph fill (`#RRGGBB`). Hyperlink tint uses `linkColor`. */
  color?: string;
  outlineColor?: string;
  /** Link text in intro copy (`introBillboardCopy`); not forwarded to `<Text>`. */
  linkColor?: string;
  /**
   * Optional webfont URL from the site root (file must live under `public/`).
   * Use `.ttf`, `.otf`, or `.woff`. Example: `"/fonts/Inter-Medium.ttf"`.
   * Omit to keep troika’s default typeface.
   */
  font?: string;
};

/** NVF publication row: GIF left, troika text right (below intro + social row). */
export type PublicationsBillboardLayout = {
  position: [number, number, number];
  /** Optional webfont for heading + body; falls back to `introText.font`. */
  font?: string;
  gif: {
    path: string;
    width: number;
    height: number;
    position: [number, number, number];
  };
  /** Optional troika text colors (`#RRGGBB`). Omitted fields keep previous defaults. */
  text?: {
    headingFill?: string;
    bodyFill?: string;
    outline?: string;
    link?: string;
  };
  heading: {
    position: [number, number, number];
    fontSize: number;
    maxWidth: number;
    outlineWidth: number;
  };
  body: {
    position: [number, number, number];
    fontSize: number;
    maxWidth: number;
    lineHeight: number;
    outlineWidth: number;
  };
};

export const spawnBillboardLayout: {
  photo: {
    position: [number, number, number];
    texturePath: string;
    width: number;
    height: number;
  };
  introText: IntroTextLayout;
  publications: PublicationsBillboardLayout;
  socialSpacing: number;
  gapBelowPhoto: number;
} = {
  photo: {
    position: [-2.22, 5.25, 6.39],
    texturePath: "/textures/world/jesse_personal_photo.jpeg",
    /** World size of the photo frame / plane (increase both to make the portrait larger). */
    width: 1.4,
    height: 1.4,
  },
  introText: {
    position: [3.05, 5.15, 6.49],
    fontSize: 0.11,
    maxWidth: 4.55,
    lineHeight: 1.24,
    outlineWidth: 0.001,
    color: "#000000",
    outlineColor: "#000000",
    linkColor: "#004182",
    // font: "/fonts/IBMPlexMono-Light.ttf",
    font: "/fonts/IBMPlexMono-Light.ttf",
  },
  publications: {
    position: [0.55, 3.38, 6.49],
    font: "/fonts/IBMPlexMono-Light.ttf",
    gif: {
      path: "/textures/world/uncertainty.gif",
      width: 2.02,
      height: 2.02,
      position: [-1.48, -0.55, 0.03],
    },
    text: {
      headingFill: "#000000",
      bodyFill: "#000000",
      // outline: "#1f2937",
      outline: "#000000",
      link: "#004182",
    },
    heading: {
      position: [-2.5, 0.4, 0.04],
      fontSize: 0.19,
      maxWidth: 4.35,
      outlineWidth: 0.001,//0.012,
    },
    body: {
      position: [-0.3, 0.04, 0.04],
      fontSize: 0.10,
      maxWidth: 4.15,
      lineHeight: 1.24,
      outlineWidth: 0.001,//0.01,
    },
  },
  /** World X gap between adjacent social sign centers (row is centered on photo X). */
  socialSpacing: 0.52,
  /** Extra space between photo bottom and top of social signs. */
  gapBelowPhoto: 0.12,
};

export type SocialSignId = "github" | "googleScholar" | "linkedin";

export function getSocialSignPositions(): Record<SocialSignId, [number, number, number]> {
  const [px, py, pz] = spawnBillboardLayout.photo.position;
  const photoHalfY = spawnBillboardLayout.photo.height / 2;
  const y = py - photoHalfY - spawnBillboardLayout.gapBelowPhoto - SOCIAL_HALF_Y;
  const d = spawnBillboardLayout.socialSpacing;

  return {
    github: [px - d, y, pz],
    googleScholar: [px, y, pz],
    linkedin: [px + d, y, pz],
  };
}
