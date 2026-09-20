import * as THREE from "three";

export function orbitSkyBody(
  progress: number,
  orbitRadius: number,
  verticalRadius: number,
  orbitAxis: "x" | "z",
  heightOffset: number,
  phaseOffset = 0,
  target = { angle: 0, position: new THREE.Vector3() },
) {
  const angle = progress * Math.PI * 2 + phaseOffset;
  const horizontal = Math.cos(angle) * orbitRadius;
  const x = orbitAxis === "x" ? horizontal : 0;
  const z = orbitAxis === "z" ? horizontal : 0;

  target.angle = angle;
  target.position.set(x, Math.sin(angle) * verticalRadius + heightOffset, z);
  return target;
}

const colors = new Map<string, THREE.Color>();
function cachedColor(value: string) {
  let color = colors.get(value);
  if (!color) { color = new THREE.Color(value); colors.set(value, color); }
  return color;
}
export function applyLerpedColor(color: THREE.Color, from: string, to: string, alpha: number) {
  color.copy(cachedColor(from)).lerp(cachedColor(to), alpha);
}

export function wrapIntoRange(value: number, min: number, max: number) {
  const range = max - min;
  if (range <= 0) return min;

  return ((((value - min) % range) + range) % range) + min;
}
