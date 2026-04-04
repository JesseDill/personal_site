"use client";

import { useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import type { Texture } from "three";
import * as THREE from "three";
import { collectedInventoryConfig } from "../config/inventory";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import type { InventoryMaterial } from "../types";

function InventoryItemPreviewScene({
  material,
  texturePaths,
}: {
  material: InventoryMaterial;
  texturePaths: string[];
}) {
  const textures = useTexture(texturePaths) as Texture[];
  const cfg = collectedInventoryConfig[material];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

  const primary = textures[0];

  if (cfg.renderKind === "voxelCube" && textures.length >= 6) {
    return (
      <>
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <mesh rotation={[0.0, 0.0, 0]} scale={0.9}>
          <boxGeometry args={[1, 1, 1]} />
          {textures.map((texture, index) => (
            <meshStandardMaterial
              key={`inventory-voxel-${index}-${texture.uuid}`}
              attach={`material-${index}`}
              map={texture}
              color="#ffffff"
              roughness={1}
              metalness={0}
              toneMapped={false}
            />
          ))}
        </mesh>
      </>
    );
  }

  const matProps = {
    map: primary,
    color: "#ffffff" as const,
    roughness: 1,
    metalness: 0,
    toneMapped: false as const,
    transparent: cfg.renderKind === "door",
    alphaTest: cfg.renderKind === "door" ? 0.5 : undefined,
    side: cfg.renderKind === "door" ? THREE.DoubleSide : THREE.FrontSide,
  };

  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      {cfg.renderKind === "slab" ? (
        <mesh rotation={[0.35, 0.5, 0]} scale={0.88}>
          <boxGeometry args={[1, 0.5, 1]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      ) : null}
      {cfg.renderKind === "stair" ? (
        <group rotation={[0.25, 0.55, 0]} scale={0.82}>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[1, 0.5, 1]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          <mesh position={[0, 0.25, -0.25]}>
            <boxGeometry args={[1, 0.5, 0.5]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      ) : null}
      {cfg.renderKind === "fence" ? (
        <group rotation={[0.2, 0.65, 0]} scale={0.78}>
          <mesh>
            <boxGeometry args={[0.25, 1, 0.25]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          <mesh position={[0.3125, -0.25, 0]}>
            <boxGeometry args={[0.375, 0.125, 0.125]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          <mesh position={[0.3125, 0.15, 0]}>
            <boxGeometry args={[0.375, 0.125, 0.125]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      ) : null}
      {cfg.renderKind === "door" ? (
        <mesh rotation={[0.15, 0.45, 0]} scale={0.5}>
          <boxGeometry args={[1, 2, 0.1875]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      ) : null}
    </>
  );
}

export function InventoryVoxelIcon({ material }: { material: InventoryMaterial }) {
  const cfg = collectedInventoryConfig[material];
  const texturePaths =
    cfg.renderKind === "voxelCube" && cfg.faceTextures
      ? cfg.faceTextures
      : "texturePath" in cfg && cfg.texturePath
        ? [cfg.texturePath]
        : [];

  return (
    <span className="collected-slot-voxel" role="img" aria-label={cfg.label}>
      <Canvas
        key={material}
        className="collected-slot-voxel-canvas"
        orthographic
        frameloop="demand"
        camera={{ position: [2.6, 2.3, 2.6], zoom: 24 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false }}
      >
        <InventoryItemPreviewScene material={material} texturePaths={texturePaths} />
      </Canvas>
    </span>
  );
}
