"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { assetPath } from "@/lib/assetPrefix";
import { configurePixelTexture } from "../materials/configurePixelTexture";

type DoorBlockProps = {
  position: [number, number, number];
};

/** Thin 2-block-tall door with alpha-tested peepholes (see `door.svg`). */
export function DoorBlock({ position }: DoorBlockProps) {
  const texture = useTexture(assetPath("/textures/world/door.svg")) as THREE.Texture;

  useEffect(() => {
    configurePixelTexture(texture);
  }, [texture]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [texture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh castShadow receiveShadow position={position} material={material}>
      <boxGeometry args={[1, 2, 0.1875]} />
    </mesh>
  );
}
