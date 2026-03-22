"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import { spawnBillboardLayout } from "../config/spawnBillboardLayout";
import {
  PUBLICATION_BODY_TEXT,
  buildPublicationTextColorRanges,
  resolvePublicationTextLinkAtHit,
} from "../config/publicationsBillboardCopy";
import { AnimatedGifPlane } from "./AnimatedGifPlane";

export function BillboardPublicationRow() {
  const p = spawnBillboardLayout.publications;
  const font = p.font ?? spawnBillboardLayout.introText.font;
  const tc = p.text;
  const publicationColorRanges = buildPublicationTextColorRanges(
    tc?.bodyFill ?? "#f8fafc",
    tc?.link ?? "#0865c9",
  );

  return (
    <group position={p.position} rotation={[0, Math.PI, 0]}>
      <AnimatedGifPlane
        src={p.gif.path}
        width={p.gif.width}
        height={p.gif.height}
        position={p.gif.position}
      />
      <Text
        position={p.heading.position}
        anchorX="left"
        anchorY="top"
        font={font}
        fontSize={p.heading.fontSize}
        fontWeight="bold"
        color={tc?.headingFill ?? "#f8fafc"}
        outlineColor={tc?.outline ?? "#1f2937"}
        outlineWidth={p.heading.outlineWidth}
        maxWidth={p.heading.maxWidth}
      >
        Publications
      </Text>
      <Text
        position={p.body.position}
        anchorX="left"
        anchorY="top"
        font={font}
        fontSize={p.body.fontSize}
        lineHeight={p.body.lineHeight}
        maxWidth={p.body.maxWidth}
        color={tc?.bodyFill ?? "#f8fafc"}
        outlineColor={tc?.outline ?? "#1f2937"}
        outlineWidth={p.body.outlineWidth}
        {...{ colorRanges: publicationColorRanges }}
        onSync={(troika) => {
          troika.userData.resolvePublicationLink = (hit: THREE.Intersection) =>
            resolvePublicationTextLinkAtHit(
              troika as THREE.Mesh & { textRenderInfo?: { caretPositions: Float32Array } },
              hit.point,
            );
        }}
      >
        {PUBLICATION_BODY_TEXT}
      </Text>
    </group>
  );
}
