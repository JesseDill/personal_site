"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { assetPath } from "@/lib/assetPrefix";
import type { DroppedBlockItem } from "../types";
import { cubeFaceOrder } from "../materials/types";
import { faceTexturePaths } from "../materials/voxelMaterialPalette";
import { useVoxelTextures } from "../materials/useVoxelTextures";
import { getHighestSupportBelowFeet } from "../physics/playerSupport";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";

function DroppedBlockItemMesh({
  item,
  faceTextures,
  canCollect,
  onCollect,
  getOccupancySnapshot,
}: {
  item: DroppedBlockItem;
  faceTextures: THREE.Texture[];
  canCollect: boolean;
  onCollect: (item: DroppedBlockItem) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const collectedRef = useRef(false);
  const centerXRef = useRef(item.blockPosition[0]);
  const centerYRef = useRef(item.blockPosition[1] + 0.46);
  const centerZRef = useRef(item.blockPosition[2]);
  const horizontalVelocityRef = useRef(new THREE.Vector2(item.drift[0], item.drift[1]));
  const verticalVelocityRef = useRef(1.8);
  const groundedRef = useRef(false);
  const itemHalfSize = 0.17;
  const itemGravity = 9.8;
  const bounceDamping = 0.22;
  const airDrag = 0.92;
  const groundFriction = 0.74;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const occupancy = getOccupancySnapshot();
    const supportTop = getHighestSupportBelowFeet(
      occupancy,
      centerXRef.current,
      centerYRef.current - itemHalfSize,
      centerZRef.current,
    );
    const groundCenterY = supportTop + itemHalfSize;

    centerXRef.current += horizontalVelocityRef.current.x * delta;
    centerZRef.current += horizontalVelocityRef.current.y * delta;

    if (!groundedRef.current) {
      verticalVelocityRef.current -= itemGravity * delta;
      centerYRef.current += verticalVelocityRef.current * delta;
      horizontalVelocityRef.current.multiplyScalar(Math.pow(airDrag, delta * 60));

      if (centerYRef.current <= groundCenterY) {
        centerYRef.current = groundCenterY;

        if (Math.abs(verticalVelocityRef.current) > 0.45) {
          verticalVelocityRef.current = Math.abs(verticalVelocityRef.current) * bounceDamping;
        } else {
          verticalVelocityRef.current = 0;
          groundedRef.current = true;
        }
      }
    } else {
      horizontalVelocityRef.current.multiplyScalar(Math.pow(groundFriction, delta * 60));
    }

    const bob = groundedRef.current ? Math.sin(state.clock.elapsedTime * 3.2 + item.phase) * 0.045 : 0;

    groupRef.current.position.set(centerXRef.current, centerYRef.current + bob, centerZRef.current);
    groupRef.current.rotation.set(0.28, state.clock.elapsedTime * 1.7 + item.phase, 0);

    if (!canCollect || collectedRef.current) {
      return;
    }

    const pickupDistance = groundedRef.current ? 0.7 : 0.7;
    const horizontalDistance = Math.hypot(
      groupRef.current.position.x - camera.position.x,
      groupRef.current.position.z - camera.position.z,
    );

    if (horizontalDistance <= pickupDistance) {
      collectedRef.current = true;
      onCollect(item);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        {faceTextures.map((texture, index) => (
          <meshStandardMaterial
            key={`dropped-item-${item.id}-${index}-${texture.uuid}`}
            attach={`material-${index}`}
            map={texture}
            color="#ffffff"
            roughness={0.92}
            metalness={0}
          />
        ))}
      </mesh>
    </group>
  );
}

export function DroppedBlockItems({
  items,
  canCollect,
  onCollect,
  getOccupancySnapshot,
}: {
  items: DroppedBlockItem[];
  canCollect: boolean;
  onCollect: (item: DroppedBlockItem) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const texturesByPath = useVoxelTextures();
  const faceTexturesByMaterial = useMemo(
    () =>
      ({
        dirt: cubeFaceOrder.map(() => texturesByPath[assetPath("/textures/world/dirt.svg")]),
        wood: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.wood[face]]),
      }) satisfies Record<DroppedBlockItem["material"], THREE.Texture[]>,
    [texturesByPath],
  );

  return (
    <>
      {items.map((item) => (
        <DroppedBlockItemMesh
          key={item.id}
          item={item}
          faceTextures={faceTexturesByMaterial[item.material]}
          canCollect={canCollect}
          onCollect={onCollect}
          getOccupancySnapshot={getOccupancySnapshot}
        />
      ))}
    </>
  );
}
