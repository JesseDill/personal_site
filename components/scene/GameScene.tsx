"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { interactionContent, type InteractionId } from "@/data/interactions";
import {
  landmarks,
  obstacleCells,
  type WorldBlock,
  worldBlocks,
  worldBounds,
  type WorldMaterial,
} from "@/data/world";

type MaterialDefinition = {
  color: string;
  roughness: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

const materialPalette = {
  grass: { color: "#7c9f50", roughness: 1 },
  grassShade: { color: "#6a8b45", roughness: 1 },
  path: { color: "#b89b6f", roughness: 0.96 },
  stone: { color: "#9f9380", roughness: 1 },
  stoneDark: { color: "#5f5a54", roughness: 1 },
  wood: { color: "#8e6438", roughness: 0.95 },
  leaves: { color: "#4d7940", roughness: 1 },
  aboutAccent: { color: "#f0d476", roughness: 0.8, emissive: "#f0d476", emissiveIntensity: 0.1 },
  resumeAccent: { color: "#79d9ff", roughness: 0.7, emissive: "#79d9ff", emissiveIntensity: 0.12 },
  projectsAccent: { color: "#f6b44d", roughness: 0.75, emissive: "#f6b44d", emissiveIntensity: 0.1 },
  researchAccent: { color: "#9bd77a", roughness: 0.8, emissive: "#9bd77a", emissiveIntensity: 0.09 },
  contactAccent: { color: "#7de4d0", roughness: 0.75, emissive: "#7de4d0", emissiveIntensity: 0.14 },
  cloud: { color: "#f8fafc", roughness: 1, metalness: 0.02 },
} satisfies Record<WorldMaterial, MaterialDefinition>;

const groupedWorldBlocks = groupBlocksByMaterial(worldBlocks);

function groupBlocksByMaterial(blocks: WorldBlock[]) {
  const grouped = {} as Record<WorldMaterial, [number, number, number][]>;

  (Object.keys(materialPalette) as WorldMaterial[]).forEach((material) => {
    grouped[material] = [];
  });

  blocks.forEach((block) => {
    grouped[block.material].push(block.position);
  });

  return grouped;
}

function InstancedVoxelBlocks({
  positions,
  material,
  castShadow = true,
}: {
  positions: [number, number, number][];
  material: MaterialDefinition;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;

    positions.forEach((position, index) => {
      dummy.position.set(position[0], position[1], position[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [dummy, positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow={castShadow} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={material.metalness ?? 0}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
      />
    </instancedMesh>
  );
}

function VoxelWorld() {
  return (
    <>
      {(Object.keys(groupedWorldBlocks) as WorldMaterial[]).map((material) => (
        <InstancedVoxelBlocks
          key={material}
          positions={groupedWorldBlocks[material]}
          material={materialPalette[material]}
          castShadow={material !== "cloud"}
        />
      ))}
    </>
  );
}

function PlayerController({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    camera.position.set(0, 1.6, 5.5);
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

    const insideBounds =
      candidate.x > worldBounds.minX + 1 &&
      candidate.x < worldBounds.maxX - 1 &&
      candidate.z > worldBounds.minZ + 1 &&
      candidate.z < worldBounds.maxZ - 1;

    if (!blocked && insideBounds) {
      camera.position.set(candidate.x, 1.6, candidate.z);
    }
  });

  return null;
}

function InteractionRaycast({ onTarget }: { onTarget: (id: InteractionId | null, label: string | null) => void }) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastTargetRef = useRef<{ id: InteractionId | null; label: string | null }>({ id: null, label: null });

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((entry) => (entry.object.userData?.interactionId as InteractionId | undefined));

    const nextTarget = hit
      ? {
          id: hit.object.userData.interactionId as InteractionId,
          label: hit.object.userData.label as string,
        }
      : { id: null, label: null };

    if (lastTargetRef.current.id === nextTarget.id && lastTargetRef.current.label === nextTarget.label) {
      return;
    }

    lastTargetRef.current = nextTarget;

    if (!hit) {
      onTarget(null, null);
      return;
    }

    onTarget(nextTarget.id, nextTarget.label);
  });

  return null;
}

function InteractableLandmark({ id, isActive }: { id: InteractionId; isActive: boolean }) {
  const landmark = landmarks.find((entry) => entry.id === id);

  if (!landmark) return null;

  const accentColor = materialPalette[landmark.accent].color;

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
      document.exitPointerLock();
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [locked, target]);

  const content = activePanel ? interactionContent[activePanel] : null;

  return (
    <div className="scene-shell">
      <Canvas camera={{ fov: 70 }} shadows>
        <color attach="background" args={["#a7cfff"]} />
        <fog attach="fog" args={["#a7cfff", 18, 54]} />
        <ambientLight intensity={0.9} />
        <hemisphereLight intensity={0.45} color="#fdf3c3" groundColor="#4c5b38" />
        <directionalLight intensity={1.25} position={[9, 12, 4]} castShadow />

        <VoxelWorld />
        {landmarks.map((landmark) => (
          <InteractableLandmark key={landmark.id} id={landmark.id} isActive={target === landmark.id} />
        ))}

        <PlayerController enabled={locked} />
        <InteractionRaycast onTarget={onTarget} />
        <PointerLockControls
          selector="#enter-world"
          onLock={() => setLocked(true)}
          onUnlock={() => {
            setLocked(false);
            setTarget(null);
            setTargetLabel(null);
          }}
        />
      </Canvas>

      <div className="hud">
        <section className="status-card" data-ui-layer="true" aria-label="World controls">
          <p className="eyebrow">Voxel portfolio prototype</p>
          <h1 className="title">Portfolio Craft</h1>
          <p className="subtitle">
            Explore a handcrafted block world, aim at a landmark, and click to open the matching section.
          </p>
          <button
            id="enter-world"
            type="button"
            className="enter-world"
            disabled={locked || Boolean(activePanel)}
            aria-describedby="world-controls"
          >
            {locked ? "Exploring" : activePanel ? "Close Panel To Re-enter" : "Enter World"}
          </button>
          <p id="world-controls" className="locked-hint">
            {locked ? "WASD to move. Click a glowing block to inspect it. Press ESC to free the cursor." : "Cursor unlocked. Use the quick bar or the classic layout if you want the fast path."}
          </p>
        </section>

        <div className="crosshair" aria-hidden="true" />

        {targetLabel && locked ? <div className="tooltip">{targetLabel}</div> : null}

        <div className="quick-links" data-ui-layer="true">
          <a href="#fallback">Skip 3D / Open standard site</a>
          <a href="mailto:hello@example.com">Contact</a>
        </div>

        <nav className="inventory" aria-label="Quick open portfolio sections" data-ui-layer="true">
          {landmarks.map((landmark) => (
            <button
              key={landmark.id}
              type="button"
              className={`inventory-slot${activePanel === landmark.id ? " active" : ""}`}
              style={{ "--slot-color": materialPalette[landmark.accent].color } as CSSProperties}
              onClick={() => setActivePanel(landmark.id)}
            >
              <span className="slot-label">{landmark.subtitle}</span>
              <span className="slot-title">{interactionContent[landmark.id].title}</span>
            </button>
          ))}
        </nav>
      </div>

      {content ? (
        <aside className="panel" role="dialog" aria-label={content.title} data-ui-layer="true">
          <p className="panel-strapline">{content.strapline}</p>
          <h2>{content.title}</h2>
          <p>{content.body}</p>
          <div className="panel-actions">
            {content.cta ? (
              <a className="cta" href={content.cta.href}>
                {content.cta.label}
              </a>
            ) : null}
            <button type="button" onClick={() => setActivePanel(null)}>
              Close
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
