# Fork patches (4thlabs/rawkoon vs upstream samuelloranger/rawkoon)

This file tracks every change this fork carries on top of upstream that isn't
just a routine sync with `upstream/main`. Its job is to survive a "start over
from a fresh fork" scenario or make a future conflict easy to resolve — read it
before touching any file listed below during a sync, and update it whenever a
new fork-only patch lands or an old one gets upstreamed.

Remotes: `origin` = `git@github.com:4thlabs/rawkoon.git` (this fork),
`upstream` = `git@github.com:samuelloranger/rawkoon.git`.

Last synced with upstream: 2026-10-21, `upstream/main` @ `16eea7a`, newest
release tag `v1.44.1` (`ef84829`, one commit behind `upstream/main`: README
screenshots).
`main` is **rebased** on top of that commit — this fork keeps a linear history
and never merges upstream into `main`, so the SHAs below change on every sync
and get refreshed here as part of it. There is no `develop` branch any more:
it was folded into `main` because GitHub only lists `workflow_dispatch`
workflows whose file sits on the default branch.

**Current state: no code patches.** Every fix this fork carried has been
merged upstream (see [Upstreamed patches](#upstreamed-patches)), so `main` is
`upstream/main` plus the fork-only scaffolding below. The patched-release
pipeline refuses to build in that state ("no patches to apply") on purpose: a
`-patched` image with nothing patched would be upstream's release under a
misleading name. Until a new patch lands, run upstream's own image
(`ghcr.io/samuelloranger/rawkoon:latest`).

**Environment note:** this fork's homelab download client is
[rdt-client](https://github.com/rogerfar/rdt-client) (a Real-Debrid proxy
that emulates the qBittorrent Web API), not qBittorrent itself. Upstream now
supports it as a download client of its own (`32863a1`), but keep it in mind
before assuming any qBittorrent bug report is about real qBittorrent.

## Patches

### ci: publish a patched image of the latest upstream release

- Commits: `18d7000` (initial pipeline), `6a74f8a` (SemVer-correct app version)
- Files: `.github/workflows/patched-release.yml` (new)
- Purpose: **fork-only infrastructure, not meant for upstream.** Lets this
  fork run upstream's latest release with our fixes on top, in a homelab,
  without waiting for those fixes to be merged upstream. Manual
  (`workflow_dispatch`): it fetches upstream's tags, branches off the newest
  `v<x.y.z>`, cherry-picks the bug-fix patches onto it, runs the tests, and
  pushes `ghcr.io/4thlabs/rawkoon:<x.y.z>-patched` plus a rolling `patched`
  tag. Point the homelab `docker-compose.yml` at `:patched` while a patch is
  carried.
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

## Upstreamed patches

Dropped at the 2026-10-21 sync. All five were ported upstream, reviewed in
`fe5c418` ("address review findings on the ported download fixes"), and ship
from `v1.41.0` on. If one of these bugs comes back, start from upstream's
commit, not from this fork's old one.

| Fork patch | Upstream commit |
| --- | --- |
| fix(qbittorrent): don't misparse a genuinely successful torrent add (`pending_count`, rdt-client's empty body) | `ff76074` |
| fix(books): don't fail a grab after the torrent is already queued | `16b841f` |
| fix(scan): parse NxNN and absolute episode numbers | `4b720f9`, rebuilt on `parseReleaseStructure` |
| fix(post-process): keep a refused pack's data and renumber anime/continued packs | `25f7a35` |
| fix(download-client): wait for rdt-client to land files and never sweep a failed import | `4eddf87` |

## Reapplying from a fresh fork

If this fork ever needs to be rebuilt from scratch:

1. Fork `samuelloranger/rawkoon` on GitHub, clone it, add both remotes as
   described above.
2. Cherry-pick `18d7000` and `6a74f8a` (CI — always needed since they're
   fork-only), then any code patch listed under "Patches" above. Try the bug
   fixes upstream first; skip any already merged there.
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

- If upstream ships its own fix for a patched bug (check the commit message
  against the "Problem" description of the patch), take upstream's version
  and move the entry to "Upstreamed patches" instead of keeping both.
- `.github/workflows/patched-release.yml`: fork-only, upstream will never
  touch it; every other workflow is upstream's, so a conflict there means
  something drifted — investigate rather than reconcile line-by-line.
