import * as THREE from "three";

const configured = new WeakSet<THREE.Texture>();

export function configurePixelTexture(texture: THREE.Texture) {
  if (configured.has(texture)) return;
  configured.add(texture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}
