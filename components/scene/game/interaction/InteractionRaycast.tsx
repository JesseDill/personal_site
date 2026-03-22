"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InteractionId } from "@/data/interactions";
import { interactionHoverMaxDistance } from "../config/particles";
import { linkHoverLabelFromHref } from "./linkHoverLabel";

export function InteractionRaycast({
  onTarget,
  pointerNdc,
}: {
  onTarget: (id: InteractionId | null, label: string | null, href: string | null) => void;
  pointerNdc?: { x: number; y: number };
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastTargetRef = useRef<{ id: InteractionId | null; label: string | null; href: string | null }>({
    id: null,
    label: null,
    href: null,
  });

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(pointerNdc?.x ?? 0, pointerNdc?.y ?? 0), camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    let nextTarget: { id: InteractionId | null; label: string | null; href: string | null } = {
      id: null,
      label: null,
      href: null,
    };

    const maxReach = interactionHoverMaxDistance;
    for (const entry of hits) {
      if (entry.distance > maxReach) continue;

      const o = entry.object;
      const resolveIntro = o.userData?.resolveIntroLink as ((h: THREE.Intersection) => { href: string; label: string } | null) | undefined;
      if (typeof resolveIntro === "function") {
        const link = resolveIntro(entry);
        if (link) {
          nextTarget = {
            id: null,
            label: linkHoverLabelFromHref(link.href, link.label),
            href: link.href,
          };
          break;
        }
        continue;
      }
      const resolvePublication = o.userData?.resolvePublicationLink as ((
        h: THREE.Intersection,
      ) => { href: string; label: string } | null) | undefined;
      if (typeof resolvePublication === "function") {
        const link = resolvePublication(entry);
        if (link) {
          nextTarget = {
            id: null,
            label: linkHoverLabelFromHref(link.href, link.label),
            href: link.href,
          };
          break;
        }
        continue;
      }
      if (o.userData?.interactionId || o.userData?.externalHref) {
        const href = (o.userData.externalHref as string | undefined) ?? null;
        const signLabel = o.userData.label as string;
        nextTarget = {
          id: (o.userData.interactionId as InteractionId | undefined) ?? null,
          label: linkHoverLabelFromHref(href, signLabel),
          href,
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
