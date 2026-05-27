export function getSafeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;

  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
      return fallback;
    }
    return path;
  } catch {
    return fallback;
  }
}
