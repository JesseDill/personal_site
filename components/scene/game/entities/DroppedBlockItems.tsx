"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { collectedInventoryConfig } from "../config/inventory";
import type { DroppedBlockItem } from "../types";
import { cubeFaceOrder } from "../materials/types";
import { faceTexturePaths } from "../materials/voxelMaterialPalette";
import { useVoxelTextures } from "../materials/useVoxelTextures";
import { getHighestSupportBelowFeet } from "../physics/playerSupport";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";
import { assetPath } from "@/lib/assetPrefix";

function DroppedItemPhysics({
  item,
  children,
  canCollect,
  onCollect,
  getOccupancySnapshot,
  halfExtentsY,
}: {
  item: DroppedBlockItem;
  children: ReactNode;
  canCollect: boolean;
  onCollect: (item: DroppedBlockItem) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
  halfExtentsY?: number;
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
  const itemHalfSize = halfExtentsY ?? 0.17;
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

    const pickupDistance = 0.7;
    const horizontalDistance = Math.hypot(
      groupRef.current.position.x - camera.position.x,
      groupRef.current.position.z - camera.position.z,
    );

    if (horizontalDistance <= pickupDistance) {
      collectedRef.current = true;
      onCollect(item);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function DroppedItemVisual({
  item,
  faceTextures,
  plankTexture,
  doorTexture,
}: {
  item: DroppedBlockItem;
  faceTextures: THREE.Texture[];
  plankTexture: THREE.Texture;
  doorTexture: THREE.Texture;
}) {
  const cfg = collectedInventoryConfig[item.material];
  const primary = plankTexture;

  if (cfg.renderKind === "sprite") {
    const map = faceTextures[0];
    return (
      <mesh castShadow={false} receiveShadow>
        <planeGeometry args={[0.34, 0.34]} />
        <meshStandardMaterial
          map={map}
          color="#ffffff"
          roughness={0.92}
          metalness={0}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  const matStd = (map: THREE.Texture, door = false) => (
    <meshStandardMaterial
      map={map}
      color="#ffffff"
      roughness={0.92}
      metalness={0}
      transparent={door}
      alphaTest={door ? 0.5 : undefined}
      side={door ? THREE.DoubleSide : THREE.FrontSide}
    />
  );

  if (cfg.renderKind === "voxelCube") {
    return (
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
    );
  }

  if (cfg.renderKind === "slab") {
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.17, 0.34]} />
        {matStd(primary)}
      </mesh>
    );
  }

  if (cfg.renderKind === "stair") {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, -0.085, 0]}>
          <boxGeometry args={[0.34, 0.17, 0.34]} />
          {matStd(primary)}
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.085, -0.085]}>
          <boxGeometry args={[0.34, 0.17, 0.17]} />
          {matStd(primary)}
        </mesh>
      </group>
    );
  }

  if (cfg.renderKind === "fence") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.085, 0.34, 0.085]} />
          {matStd(primary)}
        </mesh>
        <mesh castShadow receiveShadow position={[0.106, -0.085, 0]}>
          <boxGeometry args={[0.128, 0.043, 0.043]} />
          {matStd(primary)}
        </mesh>
        <mesh castShadow receiveShadow position={[0.106, 0.051, 0]}>
          <boxGeometry args={[0.128, 0.043, 0.043]} />
          {matStd(primary)}
        </mesh>
      </group>
    );
  }

  if (cfg.renderKind === "door") {
    return (
      <mesh castShadow receiveShadow scale={[0.34, 0.34, 0.06]}>
        <boxGeometry args={[1, 2, 0.1875]} />
        {matStd(doorTexture, true)}
      </mesh>
    );
  }

  if (cfg.renderKind === "torch") {
    return (
      <group>
        <mesh position={[0, -0.06, 0]} castShadow={false} receiveShadow>
          <boxGeometry args={[0.1, 0.2, 0.1]} />
          {matStd(primary)}
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow={false} receiveShadow>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
          <meshStandardMaterial color="#ffcc88" emissive="#ffcc88" emissiveIntensity={0.75} roughness={0.9} metalness={0} />
        </mesh>
      </group>
    );
  }

  return null;
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
        woodPlanks: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.woodPlanks[face]]),
        woodenSlab: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.woodPlanks[face]]),
        woodenStair: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.woodPlanks[face]]),
        woodenFence: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.woodPlanks[face]]),
        carrot: cubeFaceOrder.map(() => texturesByPath[assetPath("/textures/world/carrot.svg")]),
        woodenDoor: cubeFaceOrder.map(() => texturesByPath[assetPath("/textures/world/door.svg")]),
        torch: cubeFaceOrder.map((face) => texturesByPath[faceTexturePaths.woodPlanks[face]]),
      }) satisfies Record<DroppedBlockItem["material"], THREE.Texture[]>,
    [texturesByPath],
  );

  const plankTex = texturesByPath[assetPath("/textures/world/wood-planks.svg")];
  const doorTex = texturesByPath[assetPath("/textures/world/door.svg")];

  return (
    <>
      {items.map((item) => {
        const cfg = collectedInventoryConfig[item.material];
        const halfY =
          cfg.renderKind === "slab"
            ? 0.085
            : cfg.renderKind === "door"
              ? 0.34
              : cfg.renderKind === "stair"
                ? 0.15
                : cfg.renderKind === "fence"
                  ? 0.17
                  : cfg.renderKind === "sprite"
                    ? 0.17
                    : 0.17;
        return (
          <DroppedItemPhysics
            key={item.id}
            item={item}
            canCollect={canCollect}
            onCollect={onCollect}
            getOccupancySnapshot={getOccupancySnapshot}
            halfExtentsY={halfY}
          >
            <DroppedItemVisual
              item={item}
              faceTextures={faceTexturesByMaterial[item.material]}
              plankTexture={plankTex}
              doorTexture={doorTex}
            />
          </DroppedItemPhysics>
        );
      })}
    </>
  );
}
