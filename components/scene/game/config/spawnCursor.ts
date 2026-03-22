/**
 * Spawn-phase HUD cursor (while camera look is frozen, before `spawnLookUnlocked`).
 *
 * - `null` — built-in SVG pointer in `GameWorldHud`.
 * - string — image URL; place the file under `public/` and use a root path, e.g.
 *   `"/textures/world/my-cursor.png"`.
 */
export const spawnCursorImageSrc: string | null = "/textures/UI/cursors/minecraft_cursor.png";
