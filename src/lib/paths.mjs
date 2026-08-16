/** GitHub Pages project path. Keep in sync with astro.config `base`. */
export const SITE_BASE = "/crim521-mcs-guide";

export function withBase(path = "/") {
  const base = SITE_BASE.replace(/\/$/, "");
  const [pathname, hash] = String(path).split("#");
  let resolved;
  if (pathname === "/" || pathname === "") resolved = base || "/";
  else resolved = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  return hash ? `${resolved}#${hash}` : resolved;
}

export function stripBase(pathname) {
  const base = SITE_BASE.replace(/\/$/, "");
  const clean = (pathname || "/").replace(/\/$/, "") || "/";
  if (base && (clean === base || clean.startsWith(`${base}/`))) {
    return clean.slice(base.length) || "/";
  }
  return clean;
}
