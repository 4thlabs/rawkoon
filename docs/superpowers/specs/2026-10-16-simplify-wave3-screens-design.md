# Simplification wave 3: screens — design

Date: 2026-10-16 · Status: proposed, part of
`2026-10-16-simplification-program-design.md`. Home's layout was approved in
the wave 1 design review; the rest is new in this spec.

## Goal

Make the three screens people open most show less at once, on web and iOS,
without removing a feature:

- **Title page:** admin controls sit in one header strip and one ⋯ menu. The
  seven-section Management tab is gone.
- **Home:** eight widgets become two cards, Pipeline (admin) and Books.
- **Library:** a search box, one Filters button and a view toggle replace the
  toolbar's 14 controls.

Every UI change uses the existing Cozy Dusk tokens and fonts, so no new colours
or typefaces. Each screen gets one emphasised element: the title page's control
strip and Home's Pipeline card. A moved control keeps its name everywhere it
appears.

## Decisions

| # | Decision |
|---|---|
| D1 | Monitored and the quality profile live in the title page's header strip, visible from every tab. |
| D2 | The free-text poster URL field becomes "Paste an image URL" inside Artwork in Edit details. |
| D3 | iOS book release search keeps its own data path and shares the sheet chrome with the media release search. |
| D4 | The Pipeline card reads one new admin endpoint and shared type, used by both clients. |
| D5 | Listening stats move to `/books/listening`. `/stats` is deleted. |
| D6 | The Library refresh button is removed. The list already refetches on focus and on library events. |
| D7 | The iOS "For you" Home rail is removed. The hero has a For you slide, and Find › Swipe has the deck. |

## Title page

### Web (`/library/$libraryId`)

- **Tabs.** Info · Similar · Files · Releases. Files and Releases are for
  admins only, as Management and Releases are today. The `tab` search param
  accepts `info | similar | files | releases`. `management` is dropped, with
  no alias. A focused `season` or `episode` opens Files. A wanted title
  opens Releases for admins, as today.
- **Header control strip (admin).** One bordered capsule in the hero, under
  the meta chips:
  - a Monitored switch (`PATCH /:id/monitored`);
  - the quality profile as a Radix select (`PATCH /:id/quality-profile`). The
    upgrade prompt `LibraryUpgradeModal` behaves as it does today;
  - a ⋯ menu with these items:
    - Edit details…
    - Rescan files
    - Re-encode…
    - Search releases (switches to the Releases tab)
    - a separator, then Remove from library…, which uses today's confirm
      options (delete files, keep or release seeding, the hit-and-run
      warning) in a dialog.
  - On narrow screens the strip wraps to two rows: Monitored plus ⋯, then the
    profile.
- **Primary action.** One button that follows the status:
  - Wanted: Search now (movies) and Choose release.
  - Downloading or upgrading: live progress.
  - Downloaded: Search for upgrade.
  - The search gave up (`skipped`): Search again.

  Watchlist, Trailer and TMDB become quiet text links after the strip.
- **Files tab.**
  - Movie: one file card showing the name, size, resolution, codec and
    source; Re-encode and Remux; audio tracks as chips; a subtitle count.
    Codec, bitrate, path and every track fold under one "Media details"
    disclosure.
  - Show: today's season list (episodes, per-season search, monitor,
    re-encode, retry skipped).
  - Both: then Download history, with today's actions (pause or resume,
    remove, clear failed).
- **Edit details panel.** A side panel on desktop and a full-height sheet on
  mobile, opened from ⋯. It has three groups and one Save:
  - Details: title, sort title, year and overview. A changed field shows
    "Overridden" and "Reset to TMDB". An untouched field shows the TMDB value
    as its placeholder.
  - Search title: what is sent to indexers.
  - Artwork: Poster | Backdrop, a language filter, the candidate grid and
    "Paste an image URL".

  Save calls the existing overrides, search-title and artwork endpoints, then
  toasts "Details saved". It is built on `FormField`, `Input` and the Radix
  `Select`. The shared `buildTitleOptions` helper replaces the two copies in
  `LibrarySearchTitleSection` and `LibraryItemSearchTab`.
- **Deleted:** `LibraryManagementPanel` and its seven section components
  (their logic moves into the strip, the Files tab and Edit details), and
  the hard-coded English rescan labels.

### Release filters (web)

- One `FilterPanel` shell takes:
  - a trigger;
  - a title;
  - a result count;
  - the groups as children;
  - Reset and Done.

  It renders a Radix popover at 640px and up, and `MobileBottomSheet` below
  that. It moves the sheet onto the `--z-*` scale.
- The release toolbar keeps the season pills, the text filter, Filters (n),
  Sort, and refresh. Sort is a separate button on desktop and the first
  group of the sheet on mobile.
- The panel holds three groups:
  - Show: hide rejected, season packs only.
  - Trackers: include and exclude.
  - Audio languages.
- Active filters show as removable chips under the toolbar on both widths.
- Sort direction is one control with consistent icons.
- `InteractiveSearchMobileDrawer` and the toolbar's duplicated mobile tree
  are deleted. The search-title picker stays in the results status line.

### Book page (web)

- The header actions become Mark as read plus a ⋯ menu: Edit details…,
  Refresh metadata, and Remove book….
- The "Edit metadata" disclosure becomes the same Edit details panel shell,
  holding the book override fields. A cover URL appears as "Paste an image
  URL".
- Add ebook or audiobook edition moves into the Editions list, where the
  missing edition would be.

### iOS (`MediaDetailView`)

- The ⋯ menu moves from the Manage card to the navigation bar, next to the
  bookmark. It keeps the same items, plus Search releases.
- Under the hero, admins get a Monitored chip and a profile menu chip. A
  search button sits beside them, except on wanted titles, which keep the
  apricot lamp (Search releases or Auto search).
- The Manage tab becomes Files: seasons or the file card, then Download
  history.
- The two release-search sheets stay. The Similar-poster one searches a
  different title.
- `BookReleaseSearchView` and `ReleaseSearchView` share a sheet chrome:
  - the header and Done;
  - the searching, offline, failed and empty states;
  - the rejected toggle;
  - the row layout.

  The book data path (`addBookEdition`, `bookReleaseSearch`, `bookGrab`)
  stays.
- The copy "See Requests in Library" becomes "See Requests in Activity".

## Home

The layout follows the approved wave 1 mockup.

### Web

- **Order.** On desktop:
  - the hero;
  - a two-column row, Continue (left) and Pipeline above Books (right);
  - the Recently added and Upcoming rails.

  Phones stack hero, Continue, Pipeline, Books, then the rails.
- **Hero.** It keeps its sources (just arrived, for you, trending). When
  Jellyfin reports someone watching, the first slide is Now watching, with
  the title, viewer and progress. The data comes from the existing
  now-playing endpoint, merged on the client.
- **Pipeline card (admin).** Five rows, each linking to one place:

  | Row | Destination |
  |---|---|
  | Downloading (count, speed, up to three items with progress) | Activity › Queue |
  | Delayed grabs | Activity › Queue |
  | Needs attention (open attention alerts plus titles whose search gave up) | System › Health |
  | Last RSS run (when, result, next run) | System › Health |
  | Re-encoding | System › Re-encode |

  - Desktop shows every row. Phones show three and an "n more" link.
  - Idle rows are muted rather than hidden.
  - Only the Downloading row's lamp breathes, only while active, and not at
    all under reduced motion.
- **Books card.** Listening this week, the streak and a seven-day bar, linking
  to `/books/listening`. It is hidden when books are disabled. Members get it
  in the Pipeline column.
- **Deleted:**
  - `DownloadsPanel`, `LibraryAttentionPanel`, `RssStatusPanel`,
    `TranscodeWidget`, `NowWatchingWidget`, `ListeningStatsWidget` and
    `LibraryGrowthWidget` from Home;
  - `WidgetGrid`;
  - the `/stats` route. `ListeningStatsPage` moves to `/books/listening`,
    gated by `requireBooksEnabled`.

  The Books page header links to Listening.

### API

- `GET /api/dashboard/pipeline`, behind `requireAdmin`, returns
  `DashboardPipeline` from `@rawkoon/shared/types`:
  - `downloading`: count, speed in bytes per second, and the first three
    items (id, title, progress, ETA);
  - `delayed`: count;
  - `attention`: count, alerts and gave-up searches;
  - `rss`: last run time, result, releases found, next run time;
  - `reencode`: active and queued.
- It reads the same services the current widgets read. It adds no new
  state.
- The clients poll it every 15 s while Home is visible, and patch download
  progress from the existing live events.

### iOS (`HomeView`)

- **Order:** hero (with the Now watching slide), Continue, Pipeline (admin),
  Recently added, Upcoming.
- **Continue.** Its header links to Listening (`ListeningStatsView`, pushed).
  It also appears in the Books tab toolbar.
- **Pipeline** renders from the same endpoint, with the same rows,
  destinations and states.
- **Removed:**
  - the listening stats card;
  - the library growth card (it moves to the Library tab);
  - the For you rail;
  - the widget stack: Now watching, Downloads, Re-encode, Needs attention,
    RSS and Library stats.

  `ReencodeHomeCard` is deleted. Its live activity stays.

## Library

### Web (`/library`, `/books`)

- **Toolbar.** Search · Filters (n) · view toggle (grid, compact, list). The
  Filters panel uses the same `FilterPanel` shell as the release search:
  - Type, as a segmented control with counts.
  - Status: All, Downloaded, Missing, Downloading, and Gave up. Gave up is
    the existing `skipped` status, which gets its first button.
  - Language.
  - Sort: the existing seven keys. Direction reads in words that fit the
    key (Newest or Oldest, A–Z or Z–A, Largest or Smallest).
- Active filters, and a sort that isn't the default, show as removable chips
  with "Clear all".
- **URL state.** `validateSearch` types and validates `type`, `status`,
  `language`, `sortBy`, `sortDir` and `view`. Unknown values fall back to
  the defaults.
- **Growth strip.** It replaces the collapsed "Library stats" box. One line
  shows:
  - this month's added size (admins) or title count (members);
  - a twelve-week sparkline;
  - movie, episode and book counts.

  It expands into today's `LibraryStatsPanel` and the growth chart. Data
  comes from the existing growth and stats endpoints.
- **Header.** Add to library and Import downloads (admin). The refresh
  button goes.
- **Books.** The same toolbar shell:
  - search runs live, with a debounce;
  - Filters holds Kind (All, Audiobook, Ebook);
  - the view toggle has the same three modes;
  - the default order stays recent activity.
- **Deleted:** `LibraryMobileFilterSheet`, the toolbar's mobile tree, and the
  hard-coded view labels.

### iOS (`LibraryMediaView`, `LibraryBooksView`)

- **Filters chip.**
  - It is one glass chip that opens a menu: Type, then Status (with Gave
    up), then a Sort by submenu with keys and direction.
  - Its label names what is active, for example "Filters", or "Shows ·
    Missing".
  - A ✕ chip next to it clears everything, and appears only when something
    is active.
- **Shared view.** One `LibraryFilterChip` replaces the duplicated private
  `filterMenu` in both files. Books uses it with Kind only.
- **Growth strip.** It sits above the search field on Movies & Shows, using
  today's `LibraryGrowthCard` data.
- **Toolbar.** The Requests tray `NavigationLink` leaves the Library
  toolbar, because Requests is an Activity lane. The layout toggle stays.

## Lanes and PRs

One integration branch, `integration/simplify-wave3`, with one review per PR
and one merge to `main`:

0. **API:** the pipeline endpoint, its shared type and tests. It lands
   first, because both lanes read it.
1. **Web**, stacked:
   1. `FilterPanel` and Library (with Books toolbar and growth strip);
   2. title page (with release filters and the book page header);
   3. Home.
2. **iOS**, stacked:
   1. Library;
   2. title page (with shared release-sheet chrome);
   3. Home.

Every UI PR is designed with the frontend-design pass against the wave 3
review mockups, and carries before and after screenshots taken on real data
before its review.

## Out of scope

- The single "why isn't it here yet?" answer, download row state and turning
  import on automatically (wave 4). The strip's status badge keeps today's
  status words.
- New sort keys, new filters beyond Gave up, and any change to search
  results, grab logic or the Activity lanes.

## Verification

- **Web and API:**
  - `bun run typecheck`, `bun run lint` and `bun run formatCheck`;
  - the full `env -u NODE_ENV bun run test`;
  - a route sweep that every `to=` and `navigate` target resolves. In
    particular, no link to `/stats` or `tab=management` may remain.
- **iOS:** the `check-*.py` scripts, `swiftformat --lint`, and a green
  `ios.yml` run.
- **Screenshots before merge:**
  - every after-state on real data;
  - web at 1440×900 and 390×844;
  - iOS from the macbuild simulator;
  - the admin and member views of Home and the title page.
