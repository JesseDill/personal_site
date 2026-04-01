"use client";

import { Text, useTexture } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";
import {
  INTRO_BILLBOARD_TEXT,
  INTRO_TEXT_COLOR_RANGES,
  resolveIntroTextLinkAtHit,
} from "../config/introBillboardCopy";
import { configurePixelTexture } from "../materials/configurePixelTexture";

const ENABLE_TEXTURE_READBACK_WARMUP = true;

export function BillboardSocialSign({
  label,
  href,
  texturePath,
  position,
  isActive,
}: {
  label: string;
  href: string;
  texturePath: string;
  position: [number, number, number];
  isActive: boolean;
}) {
  const texture = useTexture(texturePath);
  const signFaceSize = 0.45;

  useEffect(() => {
    configurePixelTexture(texture);

    const image = texture.image as
      | {
          currentSrc?: string;
          src?: string;
          width?: number;
          height?: number;
          naturalWidth?: number;
          naturalHeight?: number;
        }
      | undefined;

    if (
      ENABLE_TEXTURE_READBACK_WARMUP &&
      typeof document !== "undefined" &&
      image &&
      typeof image.width === "number" &&
      typeof image.height === "number" &&
      image.width > 0 &&
      image.height > 0
    ) {
      const debugCanvas = document.createElement("canvas");
      debugCanvas.width = image.width;
      debugCanvas.height = image.height;
      const debugContext = debugCanvas.getContext("2d", { willReadFrequently: true });
      if (debugContext) {
        try {
          debugContext.drawImage(texture.image as CanvasImageSource, 0, 0);
          debugContext.getImageData(0, 0, debugCanvas.width, debugCanvas.height);
        } catch {
          // Ignore readback failures during Safari texture warm-up.
        }
      }
    }
  }, [texture]);

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]} renderOrder={3}>
        <boxGeometry args={[signFaceSize, signFaceSize, 0.12]} />
        <meshStandardMaterial color={isActive ? "#d7e6f7" : "#aeb6c4"} roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh
        position={[0, 0, -0.085]}
        rotation={[0, Math.PI, 0]}
        userData={{ label, externalHref: href }}
        renderOrder={4}
      >
        <planeGeometry args={[signFaceSize, signFaceSize]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}

export function BillboardPhotoSign({
  texturePath,
  position,
  width = 0.8,
  height = 0.8,
}: {
  texturePath: string;
  position: [number, number, number];
  /** World units; frame + plane match this aspect. */
  width?: number;
  height?: number;
}) {
  const texture = useTexture(texturePath);
  const signWidth = width;
  const signHeight = height;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]} renderOrder={3}>
        <boxGeometry args={[signWidth, signHeight, 0.12]} />
        <meshStandardMaterial color="#d9dde5" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0, -0.085]} rotation={[0, Math.PI, 0]} renderOrder={4}>
        <planeGeometry args={[signWidth, signHeight]} />
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}

export function BillboardIntroText({
  position,
  fontSize = 0.17,
  maxWidth = 3.55,
  lineHeight = 1.24,
  outlineWidth = 0.012,
  font,
  color = "#f8fafc",
  outlineColor = "#1f2937",
  colorRanges: colorRangesProp,
}: {
  position: [number, number, number];
  fontSize?: number;
  maxWidth?: number;
  lineHeight?: number;
  outlineWidth?: number;
  /** URL from site root to a `.ttf` / `.otf` / `.woff` under `public/`. */
  font?: string;
  color?: string;
  outlineColor?: string;
  /** Overrides default `INTRO_TEXT_COLOR_RANGES` (e.g. from `spawnBillboardLayout`). */
  colorRanges?: Record<number, number>;
}) {
  return (
    <Text
      position={position}
      rotation={[0, Math.PI, 0]}
      font={font}
      maxWidth={maxWidth}
      fontSize={fontSize}
      lineHeight={lineHeight}
      anchorX="left"
      anchorY="middle"
      color={color}
      outlineColor={outlineColor}
      outlineWidth={outlineWidth}
      // Troika `Text` supports `colorRanges`; @react-three/drei’s props omit it but R3F forwards it.
      {...{ colorRanges: colorRangesProp ?? INTRO_TEXT_COLOR_RANGES }}
      onSync={(troika) => {
        troika.userData.resolveIntroLink = (hit: THREE.Intersection) =>
          resolveIntroTextLinkAtHit(troika as THREE.Mesh & { textRenderInfo?: { caretPositions: Float32Array } }, hit.point);
      }}
    >
      {INTRO_BILLBOARD_TEXT}
    </Text>
  );
}
