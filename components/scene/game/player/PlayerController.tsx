"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  playerCollisionConfig,
  playerSpawnPosition,
  playerSpawnRotation,
  playerSneakDiagonalSpeedMultiplier,
  playerSneakHeightFactor,
  playerSneakSpeedMultiplier,
  playerSprintMultiplier,
} from "../config/player";
import {
  canPlayerOccupyFeetPosition,
  findStepUpFeetHeight,
  getHighestSupportBelowFeet,
  resolveUpwardFeetPositionWithCeiling,
} from "../physics/playerSupport";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";

function hasFeetSupport(
  snapshot: TerrainOccupancySnapshot,
  x: number,
  feetY: number,
  z: number,
): boolean {
  const top = getHighestSupportBelowFeet(
    snapshot,
    x,
    feetY + playerCollisionConfig.stepHeight,
    z,
  );
  return top >= feetY - 0.01;
}

export function PlayerController({
  enabled,
  respawnToken = 0,
  onMovingChange,
  onDistanceWalked,
  onFallLand,
  getOccupancySnapshot,
  sprintAllowed = true,
}: {
  enabled: boolean;
  /** Increment from parent to snap the player back to spawn (position, rotation, motion). */
  respawnToken?: number;
  onMovingChange: (moving: boolean) => void;
  /** Horizontal distance in world units (blocks) moved this frame; used for hunger, etc. */
  onDistanceWalked?: (distance: number) => void;
  /** Vertical drop in blocks from peak feet height while airborne to landing feet Y. */
  onFallLand?: (fallDistance: number) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
  /** When false, Shift does not increase forward speed (e.g. low hunger). */
  sprintAllowed?: boolean;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const movingRef = useRef(false);
  const jumpQueuedRef = useRef(false);
  const verticalVelocityRef = useRef(0);
  const groundedRef = useRef(true);
  const jumpVelocity = 7.1;
  const gravity = 22;
  const wasEnabledRef = useRef(enabled);
  const onDistanceWalkedRef = useRef(onDistanceWalked);
  onDistanceWalkedRef.current = onDistanceWalked;
  const onFallLandRef = useRef(onFallLand);
  onFallLandRef.current = onFallLand;
  /** Highest feet Y reached during current airborne segment; cleared on ground. */
  const airbornePeakFeetRef = useRef<number | null>(null);
  const sneakingRef = useRef(false);

  useEffect(() => {
    camera.position.set(...playerSpawnPosition);
    camera.rotation.set(...playerSpawnRotation);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
    airbornePeakFeetRef.current = null;
    movingRef.current = false;
    onMovingChange(false);
    keysRef.current.KeyW = false;
    keysRef.current.KeyS = false;
    keysRef.current.KeyA = false;
    keysRef.current.KeyD = false;
    keysRef.current.ShiftLeft = false;
    keysRef.current.ShiftRight = false;
    keysRef.current.ControlLeft = false;
    keysRef.current.ControlRight = false;
    sneakingRef.current = false;
  }, [camera, onMovingChange, respawnToken]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        jumpQueuedRef.current = true;
      }
      keysRef.current[event.code] = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const wasEnabled = wasEnabledRef.current;
    wasEnabledRef.current = enabled;

    if (!wasEnabled || enabled) return;

    movingRef.current = false;
    onMovingChange(false);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
    keysRef.current.KeyW = false;
    keysRef.current.KeyS = false;
    keysRef.current.KeyA = false;
    keysRef.current.KeyD = false;
    keysRef.current.ShiftLeft = false;
    keysRef.current.ShiftRight = false;
    keysRef.current.ControlLeft = false;
    keysRef.current.ControlRight = false;
    sneakingRef.current = false;
    airbornePeakFeetRef.current = null;
  }, [enabled, onMovingChange]);

  useFrame((_state, delta) => {
    if (!enabled) return;
    const wasGroundedAtFrameStart = groundedRef.current;
    const snapshot = getOccupancySnapshot();
    const wasSneakingLastFrame = sneakingRef.current;
    const lastEyeHeight = wasSneakingLastFrame
      ? playerCollisionConfig.eyeHeight * playerSneakHeightFactor
      : playerCollisionConfig.eyeHeight;
    const currentFeetY = camera.position.y - lastEyeHeight;
    const speed = 4.25;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    const movement = new THREE.Vector3();

    if (keysRef.current.KeyW) movement.add(forward);
    if (keysRef.current.KeyS) movement.sub(forward);
    if (keysRef.current.KeyA) movement.sub(right);
    if (keysRef.current.KeyD) movement.add(right);

    const wantsToMove = movement.lengthSq() > 0;
    const ctrlHeld = Boolean(keysRef.current.ControlLeft || keysRef.current.ControlRight);
    const shiftHeld = Boolean(keysRef.current.ShiftLeft || keysRef.current.ShiftRight);
    const sneaking = ctrlHeld && !(shiftHeld && wantsToMove) && groundedRef.current;

    if (movingRef.current !== wantsToMove) {
      movingRef.current = wantsToMove;
      onMovingChange(wantsToMove);
    }

    const activeEyeHeight = sneaking
      ? playerCollisionConfig.eyeHeight * playerSneakHeightFactor
      : playerCollisionConfig.eyeHeight;
    const activeBodyHeight = sneaking
      ? playerCollisionConfig.height * playerSneakHeightFactor
      : playerCollisionConfig.height;

    let nextX = camera.position.x;
    let nextZ = camera.position.z;
    let nextFeetY = currentFeetY;

    if (wantsToMove) {
      const sprintHeld = Boolean(keysRef.current.ShiftLeft || keysRef.current.ShiftRight);
      const forwardSprint = sprintAllowed && sprintHeld && keysRef.current.KeyW;
      let moveSpeed = speed;
      if (sneaking) {
        const diagonal =
          (keysRef.current.KeyW || keysRef.current.KeyS) &&
          (keysRef.current.KeyA || keysRef.current.KeyD);
        moveSpeed = diagonal
          ? speed * playerSneakDiagonalSpeedMultiplier
          : speed * playerSneakSpeedMultiplier;
      } else if (forwardSprint) {
        moveSpeed = speed * playerSprintMultiplier;
      }
      movement.normalize().multiplyScalar(moveSpeed * delta);

      const candidateX = camera.position.x + movement.x;
      const candidateZ = camera.position.z + movement.z;

      let proposedFeetY = nextFeetY;
      let canMoveX = false;
      if (canPlayerOccupyFeetPosition(snapshot, candidateX, nextFeetY, camera.position.z, activeBodyHeight)) {
        canMoveX = true;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpFeetHeight(
          snapshot,
          candidateX,
          nextFeetY,
          camera.position.z,
          activeBodyHeight,
        );
        if (steppedFeetY !== null) {
          proposedFeetY = steppedFeetY;
          canMoveX = true;
        }
      }
      if (canMoveX && sneaking && groundedRef.current) {
        if (!hasFeetSupport(snapshot, candidateX, proposedFeetY, camera.position.z)) {
          canMoveX = false;
          proposedFeetY = nextFeetY;
        }
      }
      if (canMoveX) {
        nextX = candidateX;
        nextFeetY = proposedFeetY;
      }

      proposedFeetY = nextFeetY;
      let canMoveZ = false;
      if (canPlayerOccupyFeetPosition(snapshot, nextX, nextFeetY, candidateZ, activeBodyHeight)) {
        canMoveZ = true;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpFeetHeight(
          snapshot,
          nextX,
          nextFeetY,
          candidateZ,
          activeBodyHeight,
        );
        if (steppedFeetY !== null) {
          proposedFeetY = steppedFeetY;
          canMoveZ = true;
        }
      }
      if (canMoveZ && sneaking && groundedRef.current) {
        if (!hasFeetSupport(snapshot, nextX, proposedFeetY, candidateZ)) {
          canMoveZ = false;
          proposedFeetY = nextFeetY;
        }
      }
      if (canMoveZ) {
        nextZ = candidateZ;
        nextFeetY = proposedFeetY;
      }
    }

    if (jumpQueuedRef.current && groundedRef.current) {
      verticalVelocityRef.current = jumpVelocity;
      groundedRef.current = false;
    }

    jumpQueuedRef.current = false;
    verticalVelocityRef.current -= gravity * delta;
    const targetFeetY = nextFeetY + verticalVelocityRef.current * delta;

    if (verticalVelocityRef.current > 0) {
      nextFeetY = resolveUpwardFeetPositionWithCeiling(
        snapshot,
        nextX,
        nextFeetY,
        targetFeetY,
        nextZ,
        activeBodyHeight,
      );
      if (nextFeetY < targetFeetY) {
        verticalVelocityRef.current = 0;
      }
      groundedRef.current = false;
    } else {
      const supportFeetY = getHighestSupportBelowFeet(
        snapshot,
        nextX,
        nextFeetY + playerCollisionConfig.stepHeight,
        nextZ,
      );

      if (targetFeetY <= supportFeetY) {
        nextFeetY = supportFeetY;
        verticalVelocityRef.current = 0;
        groundedRef.current = true;
      } else {
        nextFeetY = targetFeetY;
        const snappedSupportY = getHighestSupportBelowFeet(
          snapshot,
          nextX,
          nextFeetY + playerCollisionConfig.groundSnapDistance,
          nextZ,
        );

        if (snappedSupportY >= nextFeetY && snappedSupportY - nextFeetY <= playerCollisionConfig.groundSnapDistance) {
          nextFeetY = snappedSupportY;
          verticalVelocityRef.current = 0;
          groundedRef.current = true;
        } else {
          groundedRef.current = false;
        }
      }
    }

    const isGroundedAfterPhysics = groundedRef.current;
    if (isGroundedAfterPhysics) {
      if (!wasGroundedAtFrameStart) {
        const peak = airbornePeakFeetRef.current;
        if (peak !== null) {
          const fallDistance = peak - nextFeetY;
          if (fallDistance > 0.05) {
            onFallLandRef.current?.(fallDistance);
          }
        }
        airbornePeakFeetRef.current = null;
      } else {
        airbornePeakFeetRef.current = null;
      }
    } else {
      airbornePeakFeetRef.current = Math.max(airbornePeakFeetRef.current ?? nextFeetY, nextFeetY);
    }

    const prevX = camera.position.x;
    const prevZ = camera.position.z;
    const dx = nextX - prevX;
    const dz = nextZ - prevZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.001) {
      onDistanceWalkedRef.current?.(dist);
    }

    camera.position.set(nextX, nextFeetY + activeEyeHeight, nextZ);
    sneakingRef.current = sneaking;
  });

  return null;
}
