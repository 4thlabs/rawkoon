# Simplification wave 2: structure — design

Date: 2026-10-16 · Status: approved (wave 1 design review, all recommendations
and proposals accepted), part of `2026-10-16-simplification-program-design.md`

## Goal

Move every screen into the five places the program defines, on web and iOS:
Home, Library, Find, Activity and Settings (You, Server, System). Success
means the web nav has four entries plus an avatar menu, the iPhone bar is
Home · Media · Books · Find · Activity · avatar, title search exists once,
every time-based list lives in Activity, and Settings holds only
configuration while live monitoring sits under System.

Home's content (the Pipeline and Books cards, Now watching as a hero source)
is wave 3. This wave only points Home's existing links at the new places.

## Decisions taken in the review

| # | Decision |
|---|---|
| D1 | Find opens on Browse. Swipe is one tap away and remembered for the session. |
| D2 | Watchlist is a Find shelf. Library stays "what's on disk". |
| D3 | Activity opens on Inbox for everyone. |
| D4 | No notification bell on web. The Activity badge carries the unread count; live toasts stay. |
| D5 | System is a third group inside Settings, admins only. |
| D6 | The iPhone keeps a Books tab, hidden when books are disabled (done in wave 0). |
| D7 | Calendar is an Activity lane; Home keeps the Upcoming rail. |
| D8 | Web mobile puts the avatar in a fifth bottom slot, like the iPhone. |

Also accepted: a "Hide what I own" filter in Find, ⌘K handing title searches
to Find, and removing the search button next to the iPhone greeting.

## Paths

Old routes are deleted, not redirected. Every place that emits or links to a
path changes in the same lane: server notification URLs, iOS
`NotificationDestination`, and in-app links. The paths the server emits move
into one shared module (`@rawkoon/shared/constants`) so the API has one
source for them.

| Place | Web paths | Replaces |
|---|---|---|
| Find | `/find` (Browse, with today's Explore filters as search params plus `q`), `/find/swipe`, `/find/watchlist`, `/find/collections`, `/find/bestsellers` | `/explore`, `/discover`, `/watchlist`, `/collections`, `/books/explore` |
| Activity | `/activity` (Inbox), `/activity/queue`, `/activity/requests`, `/activity/calendar?date=`, `/activity/history` | `/notifications`, `/requests`, `/calendar`, today's `/activity` |
| Settings | `/settings/<page>` (pages below); `/settings` opens Profile | `/settings?tab=…&subtab=…` |
| Library | `/library` with a Movies & Shows · Books switch; `/books`, `/books/$bookId`, `/books/$bookId/listen`, `/books/$bookId/read` and `/books/authors` stay | the separate Books nav entry |

`/library/downloads` moves to System › Downloads. `/stats` is untouched here
(wave 3 folds it into the Books card).

## Shell

**Web desktop.** The sidebar holds Home, Library, Find and Activity, and an
avatar menu with Settings, language and sign-out. ⌘K stays: it lists
destinations and quick actions and still finds library items, books and users,
but typing a title offers "Search Find for …", which opens `/find?q=`, in
place of the palette's own TMDB results. The bell, its popover and the
sidebar's separate settings, language and logout controls go away. The
nav-position picker moves to Settings › App and leaves the sidebar's context
menu.

**Web mobile.** The bottom bar is Home · Library · Find · Activity · avatar.
The top bar keeps the logo and the page's own controls, with no search icon or
bell. The More sheet and `UserMenu` are deleted.

**Activity badge.** One count: unread inbox items, plus pending requests for
admins. Shown on the Activity nav entry on web and on the Activity tab on
iOS.

**iPhone.** The bar is Home · Media · Books · Find · Activity · avatar.
Discover, Explore and Notifications stop being tabs. The iPad and Mac sidebar
follows the same places: loose Home; Library (Movies & Shows, Books); Find;
Activity; Settings (Preferences, Server).

## Find

One page on both clients:

- One search field across your library, TMDB titles and books. Results come
  in three groups in that order. A library hit opens the item page, a title
  opens today's detail dialog or sheet, and a book opens the book flow it has
  today. The quick-search and TMDB search endpoints already exist; no API
  change.
- A Browse | Swipe switch. Browse is today's Explore grid and filters (type,
  provider, genre, sort, language) plus a "Hide what I own" toggle. Swipe is
  today's Discover deck unchanged, keyboard included. The last mode is
  remembered for the session.
- A shelves row under the field opens the full shelf pages. Watchlist and
  Collections are today's pages; Bestsellers is today's Books Explore. iOS
  gains a Collections shelf from the existing missing-collections endpoint.
- With books disabled, the Bestsellers shelf and the books result group are
  hidden.

The Library page's Add button keeps its search modal; every other mount of
`TmdbSearchModal`, the mobile Search tab, and the iPhone greeting's search
button are removed. The Books trophy link goes away on iOS, since Bestsellers
now lives in Find.

## Activity

Five lanes: a tab row on web, a segmented control on iOS.

- **Inbox:** today's notifications list, with mark-all-read and swipe-to-delete
  on iOS. Opening a row stays in the app. Two rows also act in place: a
  "search gave up" row offers Search again (admin, the existing search
  endpoint) and a pending-request row offers Review (opens Requests).
- **Queue:** admins only. In-flight downloads, delayed grabs and imports,
  each row showing one plain status (Downloading, Waiting, Importing,
  Stalled, Failed) and one reason line. The status is mapped on the client
  from today's fields; wave 4 moves that to the server. iOS already has this
  lane.
- **Requests:** today's Requests page, approve-with-profile inline.
- **Calendar:** today's month grid and day panel, `?date=` included.
- **History:** today's activity feed with its service and type filters.

Non-admins see Inbox, Requests (their own), Calendar and History.

## Settings

Three groups. Each page has its own path, listed here as `/settings/<id>`:

- **You:** `profile` (avatar, name, email), `security` (password, passkeys,
  calendar subscription link), `alerts` (notification types, push devices,
  channels), `app` (language, nav position; on iOS also playback, downloads
  over Wi-Fi, storage).
- **Server** (admins), grouped by intent:
  - `connections`: TMDB, Fanart, Jellyfin, Indexers, Download client. Indexers
    is one card with a Prowlarr | Jackett switch. The switch sets the active
    indexer manager and shows that manager's fields and RSS indexer picker.
    The "Indexer Manager" select in library settings goes away. The download
    client's completion hook sits behind Advanced.
  - `library`: folders, naming templates (Advanced), a Defaults block with the
    default movie, show and book profiles, what happens when you add a title,
    and how often to check (presets visible, custom cron behind Advanced).
  - `quality`: quality profiles and custom formats. A profile shows name,
    minimum resolution, cutoff, preferred HDR and require HDR; the other
    fields sit behind Advanced. iOS replaces the comma-separated tracker text
    with an ordered list like web.
  - `after-download`: seeding as "keep seeding until ratio X or Y days", for
    public and private trackers, with the automatic-stop toggle; per-indexer
    overrides and the file-safety settings (blocked extensions, minimum free
    space) behind Advanced. iOS gains the time targets.
  - `books`: today's Books tab without the default profile, which moved to
    `library`.
  - `people`: users, invitations, SSO providers, API keys, sessions.
  - `general`: country and upcoming releases.
  - `ai`: provider configuration only.
- **System** (admins):
  - `health`: one page answering "can Rawkoon find, grab and import right
    now?". It combines the grab readiness checklist, the latest library
    health run, open attention alerts and the last RSS run, each with its fix
    link.
  - `jobs`: scheduled jobs with Run, the queue overview and job history.
  - `reencode`: the re-encode queue and history. Its run window and advanced
    fields stay under it.
  - `downloads`: today's `/library/downloads` (Import, Seeding, Orphans), the
    download history that sits in Media › History today, and the Radarr and
    Sonarr import.
  - `blocklist`, `ai-usage` (today's AI stats and call log), `updates`
    (today's Releases tab). On iOS, Live updates diagnostics also sit here.

Web mobile replaces the 16-item `<select>` with a searchable settings index
using the same titles and keywords iOS already has. iOS keeps its search and
shows System as one row for admins.

## Lanes and PRs

Two parallel lanes on one integration branch, stacked PRs inside each lane,
one independent review per PR:

- **API** (first, small): shared path constants; notification URLs emitted
  for requests, re-encode, notifications settings, app updates and the
  calendar point at the new paths.
- **Web:** (1) shell and routes, with existing pages moved under the new
  paths; (2) Find; (3) Activity; (4) Settings.
- **iOS:** (1) tabs and `NotificationDestination`; (2) Find; (3) Activity;
  (4) Settings and System, including the Health screen built from the
  existing readiness, library-health, attention and RSS endpoints.

## Out of scope

- Home content changes, the item page and Library filters (wave 3).
- Server-derived download and acquisition state, and turning import on once
  folders are set (wave 4).
- Any new API endpoint. If a lane finds it needs one, it stops and says so.

## Verification

- Web and API: `bun run typecheck`, `bun run lint`, `bun run formatCheck`,
  the full `env -u NODE_ENV bun run test`, and a route sweep that every
  `to=`/`navigate` target and every server-emitted path resolves to an
  existing route.
- iOS: the `check-*.py` scripts, `swiftformat --lint`, and `ios.yml` green.
  Before merge, simulator screenshots of each new place on macbuild.
