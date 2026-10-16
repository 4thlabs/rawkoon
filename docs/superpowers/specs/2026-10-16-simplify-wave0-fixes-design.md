# Simplification wave 0: fixes — design

Date: 2026-10-16 · Status: approved, part of
`2026-10-16-simplification-program-design.md`

## Goal

Fix the bugs and small inconsistencies found while mapping the app, before
any structural change. Success means a non-admin can request from the
Discover deck, notification channels created on iOS deliver, the books
feature flag hides books everywhere, and both clients use the same words for
the same things.

## Web and API lane

1. **Discover deck requests for non-admins.** A right swipe and the add
   button call the admin-only library add endpoint for everyone, so a
   non-admin gets a 403 and a "Couldn't add" toast. For non-admins the deck
   creates a request through the existing request mutation, labels the action
   "Request", and announces it with the existing request toast. Admin
   behaviour is unchanged, including the add-only split. A test covers both
   roles.
2. **Forgot password link.** The login form links to `/forgot-password` under
   the password field. Hidden during first-run setup.
3. **Books flag gates every books route.** `/books`, `/books/explore`,
   `/books/authors`, `/books/$bookId`, `/books/$bookId/listen` and
   `/books/$bookId/read` redirect to `/` when `books_enabled` is off, using
   the same features query the nav uses.
4. **In-app notification links stay in the SPA.** Opening a notification with
   a same-origin path uses router navigation instead of
   `window.location.assign`, so the app doesn't reload. External URLs keep a
   full navigation.
5. **Palette shortcut hint.** The quick-action palette shows an "R" shortcut
   on Refresh that has no key handler. Remove the hint.

## iOS lane

6. **Notification channel config keys.** `NotificationChannelsCrudView` writes
   `server_url`, `access_token`, `app_token`, `api_token` and `user_key`,
   while the server dispatchers read `url`, `token` and `user`. Every channel
   type writes exactly the keys the web form writes and the dispatcher reads.
   A unit test pins the key set per type against a fixture taken from the web
   form defaults.
7. **Books tab follows the flag.** When `booksEnabled` is false the Books tab
   is absent from the phone bar and the sidebar, a stale selection falls back
   to Home through `RootTab.validated`, and Book Explore is unreachable.
8. **Delete superseded screens.** `QualityProfilesView`, `UsersView` and
   `DownloadClientView` are reachable only from DEBUG screen routes and were
   replaced by the settings CRUD views. Delete them and their debug routes.
9. **One seed ratio field.** Library settings has a "Min seed ratio" field
   that writes the same value as Seeding › Public trackers. Remove it from
   Library settings.

## Both lanes: wording

10. **Notification type labels match.** Both clients group the sixteen
    preferences under Library, Books, Requests and Other, with these labels:

    | Key | English | French |
    |---|---|---|
    | library_downloaded | Download finished | Téléchargement terminé |
    | library_grabbed | Release grabbed | Version récupérée |
    | library_failed | Download failed | Échec du téléchargement |
    | library_grab_skipped | Search gave up | Recherche abandonnée |
    | library_attention | Needs attention | À vérifier |
    | book_downloaded | Download finished | Téléchargement terminé |
    | book_grabbed | Release grabbed | Version récupérée |
    | book_failed | Import failed | Échec de l'import |
    | book_search_skipped | Search gave up | Recherche abandonnée |
    | book_author_releases | New book from a followed author | Nouveau livre d'un auteur suivi |
    | request_pending | New request | Nouvelle demande |
    | request_decided | Request approved or denied | Demande acceptée ou refusée |
    | request_available | Request ready | Demande disponible |
    | movie_release_reminder | Watchlist reminders | Rappels de la liste de suivi |
    | app_update | App updated | Application mise à jour |
    | github_release | New Rawkoon version | Nouvelle version de Rawkoon |

    On web the labels move out of `NotificationLeadingVisual.tsx` into the
    locale files.
11. **Seeding, one word.** The feature is "Seeding" ("Partage" in French)
    everywhere: the Media subtab on web, the iOS screen title and row, and
    status lines. Releasing a torrent is "Stop seeding": the toggle reads
    "Stop seeding when the target is met", and the job reads "Stop finished
    torrents". Internal ids and API fields stay as they are.

## Out of scope

- Moving or regrouping screens, tabs or settings (waves 1–3).
- Repairing channels saved with the old iOS keys. The form re-saves them with
  the correct keys when edited.
- Removing unused API endpoints, and the GB/GiB free-space wording.

## Verification

- Web and API: `bun run typecheck`, `bun run lint`, `bun run formatCheck`,
  and the full `bun run test` (web tests under `env -u NODE_ENV`).
- iOS: `bun run lint` is not enough. Build and run the app tests on macbuild,
  or push the branch for the `ios.yml` CI build.
