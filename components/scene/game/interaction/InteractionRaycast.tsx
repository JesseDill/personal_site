"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InteractionId } from "@/data/interactions";

export function InteractionRaycast({
  onTarget,
}: {
  onTarget: (id: InteractionId | null, label: string | null, href: string | null) => void;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastTargetRef = useRef<{ id: InteractionId | null; label: string | null; href: string | null }>({
    id: null,
    label: null,
    href: null,
  });

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find(
      (entry) =>
        (entry.object.userData?.interactionId as InteractionId | undefined) ||
        (entry.object.userData?.externalHref as string | undefined),
    );

    const nextTarget = hit
      ? {
          id: (hit.object.userData.interactionId as InteractionId | undefined) ?? null,
          label: hit.object.userData.label as string,
          href: (hit.object.userData.externalHref as string | undefined) ?? null,
        }
      : { id: null, label: null, href: null };

    if (
      lastTargetRef.current.id === nextTarget.id &&
      lastTargetRef.current.label === nextTarget.label &&
      lastTargetRef.current.href === nextTarget.href
    ) {
      return;
    }

    lastTargetRef.current = nextTarget;

    if (!hit) {
      onTarget(null, null, null);
      return;
    }

    onTarget(nextTarget.id, nextTarget.label, nextTarget.href);
  });

  return null;
}
