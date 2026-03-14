"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { interactionContent, type InteractionId } from "@/data/interactions";

type Block = {
  id: InteractionId;
  position: [number, number, number];
  color: string;
  label: string;
};

const blocks: Block[] = [
  { id: "resume", position: [0, 0.5, -8], color: "#70d6ff", label: "Open Resume" },
  { id: "projects", position: [3, 0.5, -12], color: "#c8ff70", label: "View Projects" },
  { id: "research", position: [-4, 0.5, -11], color: "#ffb570", label: "Enter Research Lab" },
  { id: "contact", position: [0, 0.5, -16], color: "#d58eff", label: "Contact Portal" },
];

const obstacleCells = new Set(blocks.map((block) => `${Math.round(block.position[0])}:${Math.round(block.position[2])}`));

function Ground() {
  const tiles = useMemo(() => {
    const tileData: [number, number, number][] = [];
    for (let x = -20; x <= 20; x += 1) {
      for (let z = -22; z <= 8; z += 1) {
        tileData.push([x, 0, z]);
      }
    }
    return tileData;
  }, []);

  return (
    <group>
      {tiles.map((tile) => (
        <mesh key={`${tile[0]}-${tile[2]}`} position={tile} receiveShadow>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial color={tile[2] % 2 === 0 ? "#4e8a50" : "#5d9f60"} />
        </mesh>
      ))}
    </group>
  );
}

function PlayerController({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    camera.position.set(0, 1.6, 3);
  }, [camera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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

  useFrame((_state, delta) => {
    if (!enabled) return;
    const speed = 4.25;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
    const movement = new THREE.Vector3();

    if (keysRef.current.KeyW) movement.add(forward);
    if (keysRef.current.KeyS) movement.sub(forward);
    if (keysRef.current.KeyA) movement.sub(right);
    if (keysRef.current.KeyD) movement.add(right);

    if (movement.lengthSq() === 0) return;
    movement.normalize().multiplyScalar(speed * delta);

    const candidate = camera.position.clone().add(movement);
    const cellX = Math.round(candidate.x);
    const cellZ = Math.round(candidate.z);
    const blocked = obstacleCells.has(`${cellX}:${cellZ}`);

    const insideBounds = candidate.x > -19 && candidate.x < 19 && candidate.z > -21 && candidate.z < 7;
    if (!blocked && insideBounds) {
      camera.position.set(candidate.x, 1.6, candidate.z);
    }
  });

  return null;
}

function InteractionRaycast({ onTarget }: { onTarget: (id: InteractionId | null, label: string | null) => void }) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((entry) => (entry.object.userData?.interactionId as InteractionId | undefined));

    if (!hit) {
      onTarget(null, null);
      return;
    }

    onTarget(hit.object.userData.interactionId as InteractionId, hit.object.userData.label as string);
  });

  return null;
}

function InteractableBlock({ block }: { block: Block }) {
  return (
    <mesh
      position={block.position}
      castShadow
      userData={{ interactionId: block.id, label: block.label }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={block.color} />
    </mesh>
  );
}

export default function GameScene() {
  const [target, setTarget] = useState<InteractionId | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<InteractionId | null>(null);
  const [locked, setLocked] = useState(false);

  const onTarget = useCallback((id: InteractionId | null, label: string | null) => {
    setTarget(id);
    setTargetLabel(label);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      if (!locked || !target) return;
      setActivePanel(target);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [locked, target]);

  const content = activePanel ? interactionContent[activePanel] : null;

  return (
    <div className="scene-shell">
      <Canvas camera={{ fov: 70 }} shadows>
        <color attach="background" args={["#87a9ff"]} />
        <fog attach="fog" args={["#87a9ff", 12, 40]} />
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.1} position={[6, 10, 6]} castShadow />

        <Ground />
        {blocks.map((block) => (
          <InteractableBlock key={block.id} block={block} />
        ))}

        <PlayerController enabled={locked} />
        <InteractionRaycast onTarget={onTarget} />
        <PointerLockControls
          onLock={() => setLocked(true)}
          onUnlock={() => {
            setLocked(false);
            setTarget(null);
            setTargetLabel(null);
          }}
        />
      </Canvas>

      <div className="hud">
        <p className="title">Jesse&apos;s World</p>
        <p className="subtitle">Click anywhere to enter. Move with WASD. Press ESC to unlock.</p>
        <div className="crosshair" aria-hidden="true" />

        {targetLabel && locked ? <div className="tooltip">{targetLabel}</div> : null}

        <div className="quick-links">
          <a href="#fallback">Skip 3D / Open standard site</a>
          <a href="mailto:hello@example.com">Contact</a>
        </div>
      </div>

      {content ? (
        <aside className="panel" role="dialog" aria-label={content.title}>
          <h2>{content.title}</h2>
          <p>{content.body}</p>
          {content.cta ? (
            <a className="cta" href={content.cta.href}>
              {content.cta.label}
            </a>
          ) : null}
          <button type="button" onClick={() => setActivePanel(null)}>
            Close
          </button>
        </aside>
      ) : null}
    </div>
  );
}
