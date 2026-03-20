"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useHotbarPreviewTextures } from "../hooks/useHotbarPreviewTextures";
import { armRenderFlags } from "../materials/armMaterials";
import { useArmTextures } from "../materials/useArmTextures";
import type { DroppedBlockItem } from "../types";

export function PlayerArmViewmodel({
  moving,
  swingTick,
  placeSwingTick,
  swingHeld,
  onSwingCycle,
  heldInventoryMaterial,
}: {
  moving: boolean;
  swingTick: number;
  placeSwingTick: number;
  swingHeld: boolean;
  onSwingCycle: () => void;
  heldInventoryMaterial: DroppedBlockItem["material"] | null;
}) {
  const armRef = useRef<THREE.Group>(null);
  const bobPhaseRef = useRef(0);
  const bobBlendRef = useRef(0);
  const swingProgressRef = useRef(1);
  const armTextures = useArmTextures();
  const hotbarPreviewTextures = useHotbarPreviewTextures();
  const arm_rotation: [number, number, number] = [-0.55, 0.22, -0.08];
  const arm_position: [number, number, number] = [0.98, -1.14, 0];
  const held_block_position: [number, number, number] = [0.05, -0.15, 0];
  const held_block_rotation: [number, number, number] = [0.8, 1.1, 0.3];
  const held_block_scale = 0.72;
  const swing_duration = 0.22;

  const swing_position_delta: [number, number, number] = [-0.1, -0.12, -0.5];
  const swing_rotation_delta: [number, number, number] = [-0.66, 0.24, 0.9];

  useEffect(() => {
    swingProgressRef.current = 0;
    onSwingCycle();
  }, [onSwingCycle, swingTick]);

  useEffect(() => {
    if (placeSwingTick === 0) return;
    swingProgressRef.current = 0;
  }, [placeSwingTick]);

  useFrame((_state, delta) => {
    if (!armRef.current) return;

    bobBlendRef.current = THREE.MathUtils.damp(bobBlendRef.current, moving ? 1 : 0, 8, delta);
    bobPhaseRef.current += delta * THREE.MathUtils.lerp(1.3, 10.5, bobBlendRef.current);
    swingProgressRef.current += delta / swing_duration;

    if (swingProgressRef.current >= 1) {
      if (swingHeld) {
        swingProgressRef.current = 0;
        onSwingCycle();
      } else {
        swingProgressRef.current = 1;
      }
    }

    const bobX = Math.sin(bobPhaseRef.current) * 0.05 * bobBlendRef.current;
    const bobY = Math.abs(Math.cos(bobPhaseRef.current * 0.9)) * 0.06 * bobBlendRef.current;
    const swingProgress = swingProgressRef.current;
    const strikePhase = 0.34;
    const swing =
      swingProgress < strikePhase
        ? THREE.MathUtils.smootherstep(swingProgress / strikePhase, 0, 1)
        : 1 - THREE.MathUtils.smoothstep((swingProgress - strikePhase) / (1 - strikePhase), 0, 1) * 0.92;

    armRef.current.position.set(
      arm_position[0] + bobX + swing * swing_position_delta[0],
      arm_position[1] + bobY - swing * swing_position_delta[1],
      arm_position[2] + swing * swing_position_delta[2],
    );
    armRef.current.rotation.set(
      arm_rotation[0] - bobY * 0.25 + swing * swing_rotation_delta[0],
      arm_rotation[1] - bobX * 0.18 + swing * swing_rotation_delta[1],
      arm_rotation[2] + bobX * 0.7 + swing * swing_rotation_delta[2],
    );
  });
  return (
    <>
      <ambientLight intensity={1} />
      <group ref={armRef} position={[0.88, -0.96, 0]} rotation={arm_rotation} scale={1.45}>
        <group visible={!heldInventoryMaterial}>
          <mesh frustumCulled={false} position={[0.02, -0.24, -0.006]}>
            <boxGeometry args={[0.29, 1.04, 0.29]} />
            {armTextures.skin.map((texture, index) => (
              <meshBasicMaterial
                key={`skin-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest
                depthWrite
                toneMapped={false}
              />
            ))}
          </mesh>
          {armRenderFlags.sleeve ? (
            <mesh frustumCulled={false} position={[0.02, 0.19, 0.016]}>
              <boxGeometry args={[0.325, 0.3, 0.325]} />
              {armTextures.sleeve.map((texture, index) => (
                <meshBasicMaterial
                  key={`sleeve-${index}-${texture.uuid}`}
                  attach={`material-${index}`}
                  map={texture}
                  color="#ffffff"
                  depthTest
                  depthWrite
                  toneMapped={false}
                />
              ))}
            </mesh>
          ) : null}
          {armRenderFlags.cuff ? (
            <mesh frustumCulled={false} position={[0.02, 0.31, 0.02]}>
              <boxGeometry args={[0.345, 0.08, 0.345]} />
              {armTextures.cuff.map((texture, index) => (
                <meshBasicMaterial
                  key={`cuff-${index}-${texture.uuid}`}
                  attach={`material-${index}`}
                  map={texture}
                  color="#ffffff"
                  depthTest
                  depthWrite
                  toneMapped={false}
                />
              ))}
            </mesh>
          ) : null}
        </group>
        {heldInventoryMaterial ? (
          <mesh
            frustumCulled={false}
            position={held_block_position}
            rotation={held_block_rotation}
            scale={held_block_scale}
            renderOrder={6}
          >
            <boxGeometry args={[1, 1, 1]} />
            {hotbarPreviewTextures[heldInventoryMaterial].map((texture, index) => (
              <meshBasicMaterial
                key={`arm-preview-${heldInventoryMaterial}-${index}-${texture.uuid}`}
                attach={`material-${index}`}
                map={texture}
                color="#ffffff"
                depthTest
                depthWrite
                toneMapped={false}
              />
            ))}
          </mesh>
        ) : null}
      </group>
    </>
  );
}
