"use client";

import { Text, useTexture } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";
import { configurePixelTexture } from "../materials/configurePixelTexture";

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

export function BillboardPhotoSign({ texturePath, position }: { texturePath: string; position: [number, number, number] }) {
  const texture = useTexture(texturePath);
  const signWidth = 0.8;
  const signHeight = 0.8;

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

export function BillboardIntroText({ position }: { position: [number, number, number] }) {
  return (
    <Text
      position={position}
      rotation={[0, Math.PI, 0]}
      maxWidth={1.55}
      fontSize={0.14}
      lineHeight={1.24}
      anchorX="left"
      anchorY="middle"
      color="#f8fafc"
      outlineColor="#1f2937"
      outlineWidth={0.012}
    >
      {"Hi there!"}
    </Text>
  );
}
