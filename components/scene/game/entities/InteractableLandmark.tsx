"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { landmarks } from "@/data/world";
import type { InteractionId } from "@/data/interactions";
import { voxelMaterialPalette } from "../materials/voxelMaterialPalette";

export function InteractableLandmark({ id, isActive }: { id: InteractionId; isActive: boolean }) {
  const landmark = landmarks.find((entry) => entry.id === id);

  if (!landmark) return null;

  const accentColor = voxelMaterialPalette[landmark.accent].uiColor;

  return (
    <group position={landmark.position}>
      <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.3, 1.6]} />
        <meshStandardMaterial color="#cdbb97" roughness={0.96} />
      </mesh>

      <mesh
        position={[0, 0.35, 0]}
        castShadow
        receiveShadow
        userData={{ interactionId: landmark.id, label: landmark.label }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
        }}
      >
        <boxGeometry args={[1.15, 1.15, 1.15]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.76}
          emissive={accentColor}
          emissiveIntensity={isActive ? 0.25 : 0.12}
        />
      </mesh>

      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#f8efc1" emissive="#f8efc1" emissiveIntensity={isActive ? 0.42 : 0.18} />
      </mesh>
    </group>
  );
}
