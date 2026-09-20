import * as THREE from "three";
import { timed, countWork } from "../performance/metrics";

type Kind = "interaction" | "fixture" | "door";
/** Membership follows Three's add/remove events; metadata is read at query time for async text sync. */
class PickRegistry {
  readonly meshes = new Set<THREE.Mesh>();
  version = 0;
  constructor(scene: THREE.Scene) { this.add(scene); }
  private added = (event: { child: THREE.Object3D }) => { this.add(event.child); this.version++; };
  private removed = (event: { child: THREE.Object3D }) => { this.remove(event.child); this.version++; };
  private add(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) this.meshes.add(object);
    object.addEventListener("childadded", this.added);
    object.addEventListener("childremoved", this.removed);
    for (const child of object.children) this.add(child);
  }
  private remove(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) this.meshes.delete(object);
    object.removeEventListener("childadded", this.added);
    object.removeEventListener("childremoved", this.removed);
    for (const child of object.children) this.remove(child);
  }
  targets(kind: Kind) {
    const targets: THREE.Object3D[] = [];
    for (const mesh of this.meshes) {
      const data = kind === "interaction" ? mesh.userData : fixtureData(mesh);
      if (kind === "interaction" ? data?.interactionId || data?.externalHref || data?.resolveIntroLink || data?.resolvePublicationLink :
          data && (kind !== "door" || data.fixtureKind === "door")) targets.push(mesh);
    }
    return targets;
  }
}
export function fixtureData(object: THREE.Object3D): THREE.Object3D["userData"] | undefined {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (node.userData.voxelChunk) return undefined;
    if (node.userData.terrainMaterial && node.userData.terrainMaterial !== "cloud") return node.userData;
  }
}
const registries = new WeakMap<THREE.Scene, PickRegistry>();
export function getPickRegistry(scene: THREE.Scene) {
  let registry = registries.get(scene);
  if (!registry) { registry = new PickRegistry(scene); registries.set(scene, registry); }
  return registry;
}
export function intersectPickTargets(scene: THREE.Scene, raycaster: THREE.Raycaster, kind: Kind) {
  return timed(`picking.${kind}`, () => {
    const targets = getPickRegistry(scene).targets(kind);
    // Keep event-time picks correct before the next render, especially after door toggles.
    for (const target of targets) target.updateWorldMatrix(true, false);
    countWork("pickCandidates", targets.length);
    return raycaster.intersectObjects(targets, false);
  });
}
