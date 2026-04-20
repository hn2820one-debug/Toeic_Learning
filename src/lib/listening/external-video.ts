/**
 * Helpers for opening external video URLs with suggested start time (e.g. YouTube `t=`).
 */
export function withVideoStartTime(url: string, startSec: number | null | undefined): string {
  if (startSec == null || !Number.isFinite(startSec) || startSec <= 0) {
    return url;
  }
  const t = Math.floor(startSec);
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) {
        u.searchParams.set("t", `${t}s`);
        return u.toString();
      }
      return url;
    }
    if (host === "youtu.be" || host === "www.youtu.be") {
      u.searchParams.set("t", `${t}s`);
      return u.toString();
    }
  } catch {
    return url;
  }
  return url;
}

export function formatListenWindow(startSec: number | null | undefined, endSec: number | null | undefined): string {
  if (startSec == null && endSec == null) {
    return "全片 · Full clip（自行決定停頓點）";
  }
  const a = startSec != null && Number.isFinite(startSec) ? `${Math.floor(startSec)}s` : "—";
  const b = endSec != null && Number.isFinite(endSec) ? `${Math.floor(endSec)}s` : "—";
  return `${a} → ${b}`;
}
