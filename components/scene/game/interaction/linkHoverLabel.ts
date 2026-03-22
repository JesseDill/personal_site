/**
 * Tooltip line for external URLs: show host + path (+ query + hash), no `https://` / `http://`, no leading `www.`.
 */
export function linkHoverLabelFromHref(href: string | null | undefined, fallback: string): string {
  if (!href) return fallback;
  try {
    const u = new URL(href);
    if (u.protocol === "http:" || u.protocol === "https:") {
      const hostname = u.hostname.replace(/^www\./i, "");
      const host = u.port ? `${hostname}:${u.port}` : hostname;
      const path = u.pathname.replace(/\/$/, "");
      return `${host}${path}${u.search}${u.hash}`;
    }
  } catch {
    /* not a full URL */
  }
  return href.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}
