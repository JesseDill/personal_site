declare module "troika-three-text" {
  export function getCaretAtPoint(
    textRenderInfo: { caretPositions: Float32Array } | null | undefined,
    x: number,
    y: number,
  ): { charIndex: number; x: number; y: number; height: number } | null;
}
