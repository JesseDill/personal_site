"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { countWork } from "../performance/metrics";

const noRaycast = () => {};
/** Static publication images: preserve the 512px contain layout, upload once per source. */
export function BillboardImagePlane({ src, width, height, position, rotation, canvasSize = 512 }: {
  src:string; width:number; height:number; position:[number,number,number]; rotation?:[number,number,number]; canvasSize?:number;
}) {
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);
  const canvas = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = canvasSize; return canvas;
  }, [canvasSize]);
  useEffect(() => {
    let cancelled = false;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const image = new Image(); image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      const context = canvas.getContext("2d"); if (!context) return;
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      context.clearRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      texture.needsUpdate = true; countWork("billboardUploads"); setMap(texture);
    };
    image.onerror = () => { if (!cancelled) console.warn(`Unable to load publication image: ${src}`); };
    image.src = src;
    return () => { cancelled = true; image.onload = image.onerror = null; texture.dispose(); };
  }, [canvas, src]);
  if (!map) return null;
  return <mesh position={position} rotation={rotation ?? [0,0,0]} raycast={noRaycast}>
    <planeGeometry args={[width,height]} />
    <meshBasicMaterial map={map} toneMapped={false} transparent depthWrite polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
  </mesh>;
}
