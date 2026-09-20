import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

type Entry<T> = { resource:T; users:number };
const geometries = new Map<string, Entry<THREE.BoxGeometry>>();
const materials = new Map<string, Entry<THREE.MeshStandardMaterial>>();
function useResource<T extends { dispose: () => void }>(pool:Map<string,Entry<T>>, key:string, create:()=>T) {
  const entry = useMemo(() => {
    let entry = pool.get(key);
    if (!entry) { entry = { resource:create(), users:0 }; pool.set(key,entry); }
    return entry;
    // The complete resource description is encoded in key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool,key]);
  useLayoutEffect(() => {
    entry.users++;
    return () => {
      entry.users--;
      // StrictMode cleanup/setup may occur together; keep the resource alive across that cycle.
      queueMicrotask(() => {
        if (entry.users === 0 && pool.get(key) === entry) { pool.delete(key); entry.resource.dispose(); }
      });
    };
  }, [pool,key,entry]);
  return entry.resource;
}
export function SharedBoxGeometry({ args }: { args:[number,number,number] }) {
  const geometry = useResource(geometries,args.join(":"),() => new THREE.BoxGeometry(...args));
  return <primitive object={geometry} attach="geometry" dispose={null} />;
}
export function useSharedFixtureMaterial(texture:THREE.Texture) {
  return useResource(materials,texture.uuid,() => new THREE.MeshStandardMaterial({ map:texture, roughness:.95, metalness:0 }));
}
