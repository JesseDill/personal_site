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

    let nextTarget: { id: InteractionId | null; label: string | null; href: string | null } = {
      id: null,
      label: null,
      href: null,
    };

    for (const entry of hits) {
      const o = entry.object;
      const resolveIntro = o.userData?.resolveIntroLink as ((h: THREE.Intersection) => { href: string; label: string } | null) | undefined;
      if (typeof resolveIntro === "function") {
        const link = resolveIntro(entry);
        if (link) {
          nextTarget = { id: null, label: link.label, href: link.href };
          break;
        }
        continue;
      }
      if (o.userData?.interactionId || o.userData?.externalHref) {
        nextTarget = {
          id: (o.userData.interactionId as InteractionId | undefined) ?? null,
          label: o.userData.label as string,
          href: (o.userData.externalHref as string | undefined) ?? null,
        };
        break;
      }
    }

    if (
      lastTargetRef.current.id === nextTarget.id &&
      lastTargetRef.current.label === nextTarget.label &&
      lastTargetRef.current.href === nextTarget.href
    ) {
      return;
    }

    lastTargetRef.current = nextTarget;

    onTarget(nextTarget.id, nextTarget.label, nextTarget.href);
  });

  return null;
}
