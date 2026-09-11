# Fork patches (4thlabs/rawkoon vs upstream samuelloranger/rawkoon)

This file tracks every change this fork carries on top of upstream that isn't
just a routine sync with `upstream/main`. Its job is to survive a "start over
from a fresh fork" scenario or make a future conflict easy to resolve — read it
before touching any file listed below during a sync, and update it whenever a
new fork-only patch lands or an old one gets upstreamed.

Remotes: `origin` = `git@github.com:4thlabs/rawkoon.git` (this fork),
`upstream` = `git@github.com:samuelloranger/rawkoon.git`.

Last synced with upstream: 2026-09-11, `upstream/main` @ `9445dbf`, newest
release tag `v1.22.1` (`ea6703f`, one README-screenshots commit behind
`upstream/main`).
`main` is **rebased** on top of that commit — this fork keeps a linear history
and never merges upstream into `main`, so the SHAs below change on every sync
and get refreshed here as part of it. There is no `develop` branch any more:
it was folded into `main` because GitHub only lists `workflow_dispatch`
workflows whose file sits on the default branch.

**Environment note:** this fork's homelab download client is
[rdt-client](https://github.com/rogerfar/rdt-client) (a Real-Debrid proxy
that emulates the qBittorrent Web API), not qBittorrent itself. Patch 2 below
only exists because of that — keep it in mind before assuming any
qBittorrent-parsing bug report is about real qBittorrent.

## Patches

### 1. fix(books): don't fail a grab after the torrent is already queued

- Commit: `c8e6615`
- Files: `apps/api/src/services/books/bookGrabber.ts`,
  `apps/api/src/routes/books/bookGrabRoutes.ts`
- Problem: the book grab path had no error-recovery net past the
  download-client handoff. `mediaGrabberGrab.grabRelease` (movie/TV) wraps its
  whole body in try/catch and treats any post-handoff failure as a success
  (the torrent is already committed to the client, so a later DB hiccup must
  not surface as a failed grab). `grabBookRelease` never got that same
  hardening: a failure in the `downloadHistory`/`bookEdition` update or
  `emitBookUpdate` after a successful handoff propagated uncaught to the
  route, which had no try/catch either, and hit the app's global `onError` —
  a bare 500 to the client even though the torrent was already sitting in the
  download client.
- Fix: wrapped the post-handoff DB updates in `bookGrabber.ts` in a
  try/catch that warns instead of throwing (mirrors `grabRelease`'s
  `grabCommittedOk` pattern), and added a route-level try/catch in
  `bookGrabRoutes.ts` (both `/grab` and `/auto`) as a second line of defense,
  matching `libraryGrabRoutes.ts`.
- Upstream status: **not yet submitted**. This is a generic bug fix with no
  fork-specific behavior — a good candidate for a PR against
  `samuelloranger/rawkoon`. If it lands upstream first, drop this patch on
  the next sync instead of reapplying it.

### 2. fix(qbittorrent): don't misparse a genuinely successful torrent add

- Commit: `fd628b2`
- Files: `apps/api/src/services/qbittorrent/parseAddResponse.ts` (+ colocated
  test `parseAddResponse.test.ts`)
- Problem: two independent ways a successful `/api/v2/torrents/add` came back
  as "qBittorrent rejected torrent" with an empty error message. Both were
  found while narrowing down that one user-visible symptom, and fixing only
  the first one did **not** fix this fork's actual setup:
  - qBittorrent 5.x's response can include `pending_count` (torrent accepted,
    still resolving metadata) — `parseQbittorrentAddResponse`'s own doc
    comment documented this, but the success check only ever read
    `success_count` and `added_torrent_ids`. A magnet add still fetching
    metadata at response time reports `pending_count > 0` with both of those
    at zero, so it fell through to "rejected" even though the client had
    genuinely accepted it. Book/audiobook releases skew heavily toward magnet
    links compared to movies/TV, which is why this surfaced there first.
  - rdt-client (see the environment note above) returns ASP.NET's bare `Ok()`
    on success (`server/RdtClient.Web/Controllers/QBittorrentController.cs` in
    that repo) — HTTP 200 with a genuinely **empty body**, neither the legacy
    `"Ok."` text nor qBittorrent's JSON — and `Ok("Fails.")` (still HTTP 200)
    on failure. The parser treated the empty body as neither the sentinel nor
    valid JSON and fell through to a rejection.
- Fix: treat `pending_count > 0` **and** an empty trimmed body as success. The
  empty-body half is safe because a real failure always comes back as
  non-empty `"Fails."` text in both qBittorrent and rdt-client.
- Upstream status: **not yet submitted**. The `pending_count` half is a
  generic qBittorrent bug fix, good PR candidate as-is. The empty-body half
  is only relevant to callers using an emulated qBittorrent API (rdt-client
  and similar) — still worth upstreaming since it can't mask a real failure,
  but flag that context in the PR description.

### 3. ci: publish a patched image of the latest upstream release

- Commits: `577a1a9` (initial pipeline), `fddfe9f` (SemVer-correct app version)
- Files: `.github/workflows/patched-release.yml` (new)
- Purpose: **fork-only infrastructure, not meant for upstream.** Lets this
  fork run upstream's latest release with our fixes on top, in a homelab,
  without waiting for those fixes to be merged upstream. Manual
  (`workflow_dispatch`): it fetches upstream's tags, branches off the newest
  `v<x.y.z>`, cherry-picks the bug-fix patches onto it, runs the tests, and
  pushes `ghcr.io/4thlabs/rawkoon:<x.y.z>-patched` plus a rolling `patched`
  tag. Point the homelab `docker-compose.yml` at `:patched`.
- The patch set is computed, not listed: commits in
  `upstream/main..$GITHUB_SHA` touching something outside `.github/` and
  `FORK_PATCHES.md`. Landing a fix on `main` is enough for it to ship; CI
  plumbing and edits to this file never are.
- `latest` is deliberately left alone — `docker-publish.yml` owns that tag
  for upstream releases, so this pipeline uses `patched` instead of having
  two workflows fight over one tag.
- Gotchas worth remembering if this ever needs rebuilding:
  - It cannot reuse `ci.yml` via `uses:`: a called workflow checks out the
    *calling ref*, not the patched worktree, so it would test the wrong tree.
    Its checks are inlined instead (`./.github/actions/setup` + the two test
    commands). Everything else in `.github/` is upstream's, untouched.
  - `APP_VERSION` is set to `<x.y.z>+patched` so the UI shows the patched
    build without SemVer treating it as older than the upstream release. The
    Docker tag remains `<x.y.z>-patched` because Docker tags forbid `+`.
    `GITHUB_RELEASES_REPO` points at this fork, which
    publishes no releases, so there are no "App Updated" notifications.
  - There used to be a rolling `edge` image built from every push to
    `develop` (and briefly from `main`). It was dropped: `:patched` covers
    the same need from a stable base, and dropping it left `ci.yml` exactly
    as upstream ships it.

## Reapplying from a fresh fork

If this fork ever needs to be rebuilt from scratch:

1. Fork `samuelloranger/rawkoon` on GitHub, clone it, add both remotes as
   described above.
2. Cherry-pick, in order: `fd628b2` and `c8e6615` (bug fixes — try these
   upstream first; skip any already merged there), then `577a1a9` and
   `fddfe9f` (CI — always needed since they're fork-only).
3. Re-add repo secrets used by the workflows: `GITHUB_TOKEN` is automatic;
   `DEPLOYER_WEBHOOK_URL`/`DEPLOYER_WEBHOOK_SECRET` are optional (see
   `docker-publish.yml`) and only needed if a deploy webhook is wired up.
4. Point the homelab `docker-compose.yml` at
   `ghcr.io/4thlabs/rawkoon:patched`.

## Keeping `main` in sync with upstream

`main` is **rebased** onto `upstream/main`, never merged — the fork's patches
always sit on top as the last few commits, which keeps them easy to read, to
reorder, and to drop once upstream ships its own fix.

```bash
git fetch upstream
git checkout main && git rebase upstream/main
git push --force-with-lease origin main
```

The push is a force push by design; `--force-with-lease` is what keeps it
honest. Do **not** use GitHub's "Sync fork" button here: it merges upstream
into the branch instead of rebasing, and a merge commit breaks the linear
history this file depends on.

After a rebase, refresh the commit SHAs listed under "Patches" above — they
all change — and bump the "Last synced" line. Then publish a new image via
Actions → Patched Release → Run workflow.

When rebasing, conflicts are only possible if upstream itself touches one of
the files listed under "Patches" above:

- `bookGrabber.ts` / `bookGrabRoutes.ts`: keep the try/catch shape (post-handoff
  updates non-fatal, route-level catch); reapply it on top of whatever
  upstream changed inside those functions.
- `parseAddResponse.ts`: keep both the `pending_count > 0` branch and the
  empty-body-is-success check in the success logic; reapply on top of
  upstream's version if the parsing logic moved.
- If upstream ships its own fix for either bug (check the commit message
  against the "Problem" description above), take upstream's version and
  delete the corresponding entry from this file instead of keeping both.
- `.github/workflows/patched-release.yml`: fork-only, upstream will never
  touch it; every other workflow is upstream's, so a conflict there means
  something drifted — investigate rather than reconcile line-by-line.
