/**
 * Parse the response from POST /api/v2/torrents/add. qBittorrent has shipped
 * two formats over the years and we have to accept both, plus one more from
 * a qBittorrent-API-compatible proxy rather than qBittorrent itself:
 *
 *   - Legacy (<= 4.x): plain-text body "Ok." on success, anything else = fail.
 *   - qBittorrent 5.x: JSON body
 *     `{ "added_torrent_ids": [..], "success_count": N, "pending_count": M,
 *        "failure_count": K }`.
 *   - rdt-client (github.com/rogerfar/rdt-client, a debrid-service proxy
 *     that emulates this same endpoint for Sonarr/Radarr/Rawkoon-style
 *     clients): returns ASP.NET's bare `Ok()` on success, i.e. HTTP 200 with
 *     an EMPTY body — no "Ok." text, no JSON — and `Ok("Fails.")` (still
 *     HTTP 200) on failure.
 *
 * Returns success when the legacy "Ok." sentinel is present, the body is
 * empty (rdt-client's success case — a genuine failure always comes back as
 * non-empty "Fails." text, in both qBittorrent and rdt-client), OR the JSON
 * shape reports `success_count > 0`, `pending_count > 0` (still resolving
 * metadata — the common case for a magnet add, which book/audiobook
 * releases favor far more than movies/TV), or has any `added_torrent_ids`.
 * On JSON.parse failure, logs the raw body length + first 32 bytes as hex so
 * HTTP framing / BOM / encoding issues are diagnosable from the logs.
 */
export function parseQbittorrentAddResponse(
  responseText: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = responseText.trim();
  if (trimmed === "" || /^ok\.?$/i.test(trimmed)) return { ok: true };
  try {
    const parsed = JSON.parse(trimmed) as {
      added_torrent_ids?: unknown;
      success_count?: unknown;
      pending_count?: unknown;
    };
    if (parsed && typeof parsed === "object") {
      const successCount =
        typeof parsed.success_count === "number" ? parsed.success_count : 0;
      const pendingCount =
        typeof parsed.pending_count === "number" ? parsed.pending_count : 0;
      const idCount = Array.isArray(parsed.added_torrent_ids)
        ? parsed.added_torrent_ids.length
        : 0;
      if (successCount > 0 || pendingCount > 0 || idCount > 0) {
        return { ok: true };
      }
    }
  } catch (e) {
    const hexPreview = Buffer.from(responseText.slice(0, 32), "utf8").toString(
      "hex",
    );
    console.warn(
      `[parseQbittorrentAddResponse] JSON.parse failed: len=${responseText.length} hex32=${hexPreview} err=${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return { ok: false, error: trimmed };
}
