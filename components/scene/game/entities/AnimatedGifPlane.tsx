"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Draws an animated GIF onto a `CanvasTexture` each frame (browser decodes GIF on an `Image`).
 * Raycasting is disabled so center-ray link picking hits troika `Text` beside this plane.
 */
export function AnimatedGifPlane({
  src,
  width,
  height,
  position,
  rotation,
  canvasSize = 512,
}: {
  src: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  canvasSize?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = canvasSize;
    c.height = canvasSize;
    return c;
  }, [canvasSize]);

  useEffect(() => {
    let cancelled = false;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setMap(tex);
    };
    imgRef.current = img;

    return () => {
      cancelled = true;
      tex.dispose();
      setMap(null);
    };
  }, [canvas, src]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.raycast = () => {};
  }, [map]);

  useFrame(() => {
    const img = imgRef.current;
    const tex = map;
    if (!img || !tex || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const ox = (cw - w) / 2;
    const oy = (ch - h) / 2;
    ctx.drawImage(img, ox, oy, w, h);
    tex.needsUpdate = true;
  });

  if (!map) return null;

  return (
    <mesh ref={meshRef} position={position} rotation={rotation ?? [0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={map}
        toneMapped={false}
        transparent
        depthWrite
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}
