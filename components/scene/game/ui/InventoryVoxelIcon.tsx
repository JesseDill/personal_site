"use client";

import { useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import type { Texture } from "three";
import { collectedInventoryConfig } from "../config/inventory";
import { configurePixelTexture } from "../materials/configurePixelTexture";
import type { DroppedBlockItem } from "../types";

function InventoryVoxelPreviewScene({ texturePaths }: { texturePaths: string[] }) {
  const textures = useTexture(texturePaths) as Texture[];

  useEffect(() => {
    textures.forEach((texture) => {
      configurePixelTexture(texture);
    });
  }, [textures]);

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

export function InventoryVoxelIcon({ material }: { material: DroppedBlockItem["material"] }) {
  const config = collectedInventoryConfig[material];

  return (
    <span className="collected-slot-voxel" role="img" aria-label={config.label}>
      <Canvas
        className="collected-slot-voxel-canvas"
        orthographic
        frameloop="demand"
        camera={{ position: [2.6, 2.3, 2.6], zoom: 24 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false }}
      >
        <InventoryVoxelPreviewScene texturePaths={config.faceTextures} />
      </Canvas>
    </span>
  );
}
