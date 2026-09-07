# Rawkoon Android TV — Audiobook Player (Design)

**Date:** 2026-09-07
**Status:** Approved design, pre-implementation
**Repo:** `~/sites/rawkoon-android-tv` (standalone, not part of the `rawkoon` monorepo)

## Goal

A native Android TV app that plays audiobooks from a Rawkoon server —
the CarPlay audiobook experience, ported to the living-room TV. Browse
the audiobook library, resume where you left off, play with chapter
navigation and remote-friendly controls, and sync listening position
back to the server.

Rawkoon handles acquisition; this app is a **playback client** for the
audiobooks Rawkoon has already grabbed. Non-goal: managing downloads,
requesting content, or any movie/TV features.

## Reference

Model the behavior on the existing iOS/CarPlay audiobook flow in the
`rawkoon` monorepo:
- `apps/ios/Sources/RawkoonKit/CarPlayBrowse.swift`,
  `BookManifest.swift`, `PositionJournal.swift` — the Linux-tested pure
  logic to mirror in Kotlin.
- `apps/ios/Rawkoon/AppModel.swift` `carPlayAudiobooks()` — the flat
  browse model (title, author, cover, position, total duration).

## Target devices

- Fire TV Stick 4K Max — Fire OS 8 (Android 11 / SDK 30), **armeabi-v7a**.
- Sony XBR-65X900H — Android TV 12 (SDK 31), **armeabi-v7a**.
- `minSdk = 25`, `targetSdk = 34`. No NDK / native libs → a single
  universal APK installs on both.

## Stack

- **Kotlin**, single Gradle module.
- **Compose for TV** (`androidx.tv:tv-material`, `androidx.tv:tv-foundation`)
  for leanback UI.
- **Media3** (`androidx.media3:media3-exoplayer`, `media3-session`,
  `media3-ui`) — `ExoPlayer` for playback, `MediaLibraryService` /
  `MediaSession` for background audio + remote transport controls.
- **Ktor client** (OkHttp engine) + **kotlinx.serialization** for the API.
- **EncryptedSharedPreferences** (`androidx.security:security-crypto`) for
  the session token + server URL.
- JVM unit tests: **JUnit** (+ kotlin test) for pure logic.

## Module layout

```
app/
  data/
    RawkoonApi.kt        // Ktor client: auth, books, progress, manifest
    Models.kt           // @Serializable DTOs (snake_case JSON)
    Session.kt          // token + baseUrl storage (encrypted)
    LibraryRepository.kt // books + progress -> AudiobookSummary list
  player/
    PlaybackService.kt  // MediaLibraryService host
    PlaybackController.kt // manifest -> playlist, global<->chapter mapping
    ProgressSync.kt     // throttled PUT of position
  ui/
    login/LoginScreen.kt
    library/LibraryScreen.kt
    player/PlayerScreen.kt
    theme/…             // Compose-TV theme
  MainActivity.kt        // nav host (login -> library -> player)
```

Each unit has one purpose and a narrow interface: `RawkoonApi` speaks
HTTP only; `LibraryRepository` merges books+progress into a display
model; `PlaybackController` owns the ExoPlayer playlist and the
global↔chapter position math; `ProgressSync` owns the throttled server
writes. The position math and the manifest→playlist build are pure and
unit-tested independently of Android.

## API contract (verified against `rawkoon` API)

Base URL is the user's Rawkoon server. Session token from sign-in is
sent as the session cookie / bearer per better-auth (confirm exact
header during implementation against `apps/api/src/auth.ts`).

- `POST /api/auth/sign-in/email` `{ email, password }` → session token.
- `GET  /api/auth/me` → validates the session; used on launch.
- `GET  /api/books` → book list; filter to audiobook editions
  (title, author, cover path, editionId, duration).
- `GET  /api/books/progress` →
  `[{ edition_id, position_secs, total_duration_secs, finished, updated_at }]`.
- `GET  /api/books/editions/:id/manifest` →
  `{ total_duration_secs, chapters: [{ index, title, start_secs,
  end_secs, file_id, size_bytes, sha256, url }] }`.
  Requires `offlineReady` + chapters present; if not ready, the book is
  shown but not playable (surface a clear message).
- Chapter `url` = `/api/books/files/{fileId}/content?grant=<signed>` —
  **signed grant is the only auth**, and it honors HTTP **Range**. So
  ExoPlayer streams chapter files directly with no auth header, and
  seeking works via range requests.
- `PUT  /api/books/editions/:id/progress`
  `{ position_secs, total_duration_secs }` → upsert listening position.

Cover/poster paths may be relative → resolve against the server base
URL (mirror `AppModel.absoluteURL`).

## Screens & flow

1. **Login / Settings** — server URL + email + password (on-screen
   keyboard). On success: store token + baseUrl encrypted, go to
   Library. On launch, if a stored token validates via `/auth/me`, skip
   straight to Library. A "sign out" action clears storage.
   *(QR / phone pairing is a phase-2 nicety, out of v1.)*

2. **Library (browse)** — Compose-TV grid of audiobooks: cover, title,
   author, and a progress bar (from merged `/books/progress`). Ordered
   by the server's list order (`libraryOrder`), like CarPlay. Selecting
   an item opens the Player. Empty/loading/error states handled.

3. **Player** — cover + title/author, scrollable **chapter list**
   (current chapter highlighted), and transport controls: play/pause,
   skip −30s / +30s, previous / next chapter, and a seek bar showing
   global position / total. Opening resumes from the saved position.
   The Media3 session exposes the same controls to the TV remote's
   media keys and keeps audio playing when the UI is backgrounded.

## Playback model

- `PlaybackController` turns a manifest into an ExoPlayer playlist: one
  `MediaItem` per chapter file, in `index` order, each tagged with its
  `start_secs`/`end_secs`.
- **Global position** = (sum of durations of chapters before the
  current one) + (position within the current chapter). Seeking a
  global time resolves to `(chapterIndex, offsetInChapter)` and calls
  `player.seekTo(window, offset)`. This mapping is pure and unit-tested.
- Skip ±30s operates on global time (may cross chapter boundaries).
- `PlaybackService` is a `MediaLibraryService`; the UI binds a
  `MediaController` to it. Background playback + remote transport come
  from the session.

## Progress sync

- `ProgressSync` writes `PUT …/progress` on: pause, seek, chapter
  change, and a throttle (~every 15s) while playing; plus once on
  stop/close. Throttle + "only write if moved" logic is pure and
  unit-tested.
- On opening a book: `GET /books/progress` (or the per-edition value
  already loaded in Library) → seek to `position_secs` (unless
  `finished`, then start at 0).
- Last-writer-wins against other clients (phone/CarPlay); no merge —
  matches the existing iOS behavior.

## Build & deploy

- **One-time toolchain setup** (JDK 21 already present): install Android
  SDK command-line tools headless under `~/Android/Sdk`, then
  `sdkmanager "platform-tools" "platforms;android-34"
  "build-tools;34.0.0"`. Accept licenses. Set `ANDROID_HOME`. Commit a
  `local.properties` template (git-ignore the real one).
- **Build:** Gradle wrapper `./gradlew assembleDebug` → APK.
- **Install:** via ADB (through the same throwaway `android-tools`
  docker container used this session) to Fire `192.168.50.219:5555` and
  Sony `192.168.50.35:5555`.
- Standalone git repo. No container / deployer sidecar (it is a client
  APK, not a homelab service).

## Testing

- **JVM unit tests** (no device) for the pure logic:
  - global↔chapter position mapping (round-trips, boundaries, skip
    across chapters),
  - progress-sync throttle + "moved enough to write" decision,
  - manifest → ExoPlayer playlist ordering,
  - relative→absolute cover URL resolution.
- **Manual on-device** for UI, playback, remote controls, resume, and
  background audio (no automated instrumentation in v1).

## Out of scope (v1) — deferred

Offline downloads, playback speed control, sleep timer, ebook reading,
search within the app, QR/phone pairing, multi-user niceties. Revisit
after v1 is playing audiobooks end-to-end.

## Risks / open questions

- **better-auth token transport**: confirm whether the API expects a
  cookie or `Authorization: Bearer` for the session token — read
  `apps/api/src/auth.ts` during implementation and match it.
- **Compose for TV maturity**: `androidx.tv` is 1.0-era; if a needed
  component is missing, fall back to a plain focusable Compose control.
- **`offlineReady` gating**: a book with no prepared chapters returns no
  playable manifest; the UI must say so rather than fail silently.
