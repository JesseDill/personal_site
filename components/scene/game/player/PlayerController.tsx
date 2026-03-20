"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { playerCollisionConfig, playerSpawnPosition, playerSpawnRotation } from "../config/player";
import {
  canPlayerOccupyFeetPosition,
  findStepUpFeetHeight,
  getHighestSupportBelowFeet,
  resolveUpwardFeetPositionWithCeiling,
} from "../physics/playerSupport";
import type { TerrainOccupancySnapshot } from "../terrain/occupancy";

export function PlayerController({
  enabled,
  onMovingChange,
  getOccupancySnapshot,
}: {
  enabled: boolean;
  onMovingChange: (moving: boolean) => void;
  getOccupancySnapshot: () => TerrainOccupancySnapshot;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const movingRef = useRef(false);
  const jumpQueuedRef = useRef(false);
  const verticalVelocityRef = useRef(0);
  const groundedRef = useRef(true);
  const jumpVelocity = 7.1;
  const gravity = 22;

  useEffect(() => {
    camera.position.set(...playerSpawnPosition);
    camera.rotation.set(...playerSpawnRotation);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
  }, [camera]);

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
    if (enabled || !movingRef.current) return;
    movingRef.current = false;
    onMovingChange(false);
    verticalVelocityRef.current = 0;
    groundedRef.current = true;
    jumpQueuedRef.current = false;
    camera.position.set(...playerSpawnPosition);
    camera.rotation.set(...playerSpawnRotation);
  }, [camera, enabled, onMovingChange]);

  useFrame((_state, delta) => {
    if (!enabled) return;
    const snapshot = getOccupancySnapshot();
    const speed = 4.25;
    const currentFeetY = camera.position.y - playerCollisionConfig.eyeHeight;
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
    if (movingRef.current !== wantsToMove) {
      movingRef.current = wantsToMove;
      onMovingChange(wantsToMove);
    }

    let nextX = camera.position.x;
    let nextZ = camera.position.z;
    let nextFeetY = currentFeetY;

    if (wantsToMove) {
      movement.normalize().multiplyScalar(speed * delta);

      const candidateX = camera.position.x + movement.x;
      const candidateZ = camera.position.z + movement.z;

      if (canPlayerOccupyFeetPosition(snapshot, candidateX, nextFeetY, camera.position.z)) {
        nextX = candidateX;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpFeetHeight(snapshot, candidateX, nextFeetY, camera.position.z);
        if (steppedFeetY !== null) {
          nextX = candidateX;
          nextFeetY = steppedFeetY;
        }
      }

      if (canPlayerOccupyFeetPosition(snapshot, nextX, nextFeetY, candidateZ)) {
        nextZ = candidateZ;
      } else if (groundedRef.current) {
        const steppedFeetY = findStepUpFeetHeight(snapshot, nextX, nextFeetY, candidateZ);
        if (steppedFeetY !== null) {
          nextZ = candidateZ;
          nextFeetY = steppedFeetY;
        }
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
      nextFeetY = resolveUpwardFeetPositionWithCeiling(snapshot, nextX, nextFeetY, targetFeetY, nextZ);
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

    camera.position.set(nextX, nextFeetY + playerCollisionConfig.eyeHeight, nextZ);
  });

  return null;
}
