import { NextResponse } from "next/server";

/**
 * Minimum protection for GET /api/export/* routes.
 *
 * If `EXPORT_API_SECRET` is set (non-empty): require header `X-Export-Secret` to match exactly (401 otherwise).
 * If unset: only allow requests whose Host is loopback (127.0.0.1, ::1, localhost) so casual remote access is blocked (403 otherwise).
 *
 * Local dev: open or curl `http://127.0.0.1:5173/api/export/...` without extra headers.
 * Remote or CI: set EXPORT_API_SECRET and pass `X-Export-Secret: <same>`.
 */
export function assertExportAllowed(request: Request): NextResponse | null {
  const secret = process.env.EXPORT_API_SECRET?.trim();
  if (secret && secret.length > 0) {
    const provided = request.headers.get("x-export-secret");
    if (provided !== secret) {
      return NextResponse.json(
        { error: "Unauthorized: invalid or missing X-Export-Secret header." },
        { status: 401 },
      );
    }
    return null;
  }

  const host = (request.headers.get("host") ?? "").toLowerCase();
  const loopback =
    host.startsWith("127.0.0.1:") ||
    host === "127.0.0.1" ||
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("[::1]:") ||
    host === "[::1]";

  if (!loopback) {
    return NextResponse.json(
      {
        error:
          "Forbidden: export is only allowed from localhost. Set EXPORT_API_SECRET in the environment and send matching X-Export-Secret for non-local access.",
      },
      { status: 403 },
    );
  }

  return null;
}
