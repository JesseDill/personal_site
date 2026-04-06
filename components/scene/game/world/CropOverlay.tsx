"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WorldBlock } from "@/data/world";
import { assetPath } from "@/lib/assetPrefix";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import { getTerrainBlockKey } from "../terrain/blockKeys";

const carrotTextureUrl = assetPath("/textures/world/carrot.svg");
const crossPlaneGeo = new THREE.PlaneGeometry(0.28, 0.35);

/** Five XZ offsets (local to block top) for carrot clusters. */
const CARROT_OFFSETS: [number, number][] = [
  [-0.25, -0.2],
  [0.2, 0.25],
  [0.0, -0.3],
  [-0.2, 0.2],
  [0.25, -0.05],
];

function CarrotCross({
  offset,
  material,
}: {
  offset: [number, number];
  material: THREE.MeshStandardMaterial;
}) {
  return (
    <group position={[offset[0], 0, offset[1]]}>
      <mesh geometry={crossPlaneGeo} material={material} rotation={[0, 0, 0]} />
      <mesh geometry={crossPlaneGeo} material={material} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

function CarrotCrop({
  position,
  material,
}: {
  position: [number, number, number];
  material: THREE.MeshStandardMaterial;
}) {
  const baseY = position[1] + 0.5;
  return (
    <group position={[position[0], baseY, position[2]]}>
      {CARROT_OFFSETS.map(([dx, dz], i) => (
        <CarrotCross key={i} offset={[dx, dz]} material={material} />
      ))}
    </group>
  );
}

export function CropOverlay({
  cropKeys,
  visibleBlocks,
}: {
  cropKeys: ReadonlySet<string>;
  visibleBlocks: WorldBlock[];
}) {
  const texture = useTexture(carrotTextureUrl) as THREE.Texture;

  useEffect(() => {
    configurePixelTexture(texture);
  }, [texture]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0,
      }),
    [texture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const croppedPositions = useMemo(() => {
    if (cropKeys.size === 0) return [];
    return visibleBlocks
      .filter((b) => b.material === "farmland" && cropKeys.has(getTerrainBlockKey(b.position)))
      .map((b) => b.position);
  }, [cropKeys, visibleBlocks]);

  return (
    <>
      {croppedPositions.map((pos) => (
        <CarrotCrop key={`${pos[0]}:${pos[1]}:${pos[2]}`} position={pos} material={material} />
      ))}
    </>
  );
}
