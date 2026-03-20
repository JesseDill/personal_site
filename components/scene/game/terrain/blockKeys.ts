export function getTerrainBlockKey(position: [number, number, number]) {
  return `${position[0]}:${position[1]}:${position[2]}`;
}
