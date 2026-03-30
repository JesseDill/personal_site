/**
 * Prefix for URLs under `public/` when the app is served from a subpath
 * (e.g. GitHub Pages at `https://user.github.io/repo/`).
 * Must match `basePath` in `next.config.mjs`.
 *
 * Override with `NEXT_PUBLIC_BASE_PATH` (e.g. empty string for root deploy).
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/personal_site";

export function assetPath(path: string): string {
  if (!path.startsWith("/")) {
    return `${BASE_PATH}/${path}`;
  }
  return `${BASE_PATH}${path}`;
}
