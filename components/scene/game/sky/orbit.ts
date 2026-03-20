import * as THREE from "three";

export function orbitSkyBody(
  progress: number,
  orbitRadius: number,
  verticalRadius: number,
  orbitAxis: "x" | "z",
  heightOffset: number,
  phaseOffset = 0,
) {
  const angle = progress * Math.PI * 2 + phaseOffset;
  const horizontal = Math.cos(angle) * orbitRadius;
  const x = orbitAxis === "x" ? horizontal : 0;
  const z = orbitAxis === "z" ? horizontal : 0;

  return {
    angle,
    position: new THREE.Vector3(x, Math.sin(angle) * verticalRadius + heightOffset, z),
  };
}

export function applyLerpedColor(color: THREE.Color, from: string, to: string, alpha: number) {
  color.set(from).lerp(new THREE.Color(to), alpha);
}

export function wrapIntoRange(value: number, min: number, max: number) {
  const range = max - min;
  if (range <= 0) return min;

  return ((((value - min) % range) + range) % range) + min;
}
