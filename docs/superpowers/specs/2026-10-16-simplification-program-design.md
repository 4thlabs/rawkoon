# Simplification program — design

Date: 2026-10-16 · Status: approved direction; each wave gets its own spec

## Goal

Make Rawkoon simpler to use on web and iOS without removing features. A
survey of every route, screen, setting and background job showed that the
complexity comes from the same job living in several places (title search in
eight, downloads in seven, stats and notifications in five each) and from
Settings mixing configuration with live monitoring. Success means every
feature has exactly one home and Settings holds only configuration.

## Target structure

Five places on both clients:

| Place | Holds | Replaces |
|---|---|---|
| Home | hero, Continue (listening + reading), Recently added, Upcoming, one admin Pipeline card | eight dashboard widgets |
| Library | Movies & Shows, Books; item pages | separate Library and Books entries on web |
| Find | one search (titles, books, library), browse grid with filters, Swipe mode, shelves for Watchlist, Collections and book bestsellers | Explore, Discover, Watchlist, Collections, Books Explore, the mobile Search tab, three search modals |
| Activity | Inbox, Queue, Requests, Calendar, History | Calendar, Requests, Notifications, the activity page, Settings › Activity |
| Settings | You (profile, security, alerts, app prefs); Server (configuration only); System for admins (health, jobs, queues, logs) | sixteen settings tabs and six Media subtabs |

On the iPhone, Books keeps its own tab because the audiobook player is the
reason the app is native. The phone bar becomes Home, Media, Books, Find,
Activity and the avatar.

## Waves

Each wave lands on an integration branch with one PR per item, one
independent review per PR, and a single merge to `main`.

0. **Fixes** — bugs and small cleanups that need no design decision
   (`2026-10-16-simplify-wave0-fixes-design.md`).
1. **Design review** — screenshots and before/after mockups of Find, Activity,
   Settings/System and Home on both clients, approved before code. Its output
   is the wave 2 spec.
2. **Structure** — Find, then Activity, then Settings/System (regrouped by
   intent, with Advanced disclosures for expert fields). Web and iOS in
   parallel lanes.
3. **Screens** — item page, Home, Library filters.
4. **Acquisition state** — one server-derived answer to "why isn't this here
   yet?" per item, episode and edition, plus a derived state on download rows
   and turning import on once library paths are set.

## Decisions

- Old web URLs are not kept. Moved or removed routes are deleted, not
  redirected. Every place that emits a path is updated in the same change:
  server notification URLs, iOS `NotificationDestination`, and in-app links.
- Specs only. Implementation works from the wave spec; no separate plan
  documents.
- Nothing ships to `main` mid-wave. A release is cut only on request.
