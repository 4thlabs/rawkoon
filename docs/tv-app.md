# TV app

RawkoonTV is the Android TV and Fire TV app for Rawkoon. Rawkoon finds and
downloads your movies and shows; Jellyfin plays them. RawkoonTV puts both on
the TV: you sign in to Rawkoon once, and it sets up Jellyfin for you.

RawkoonTV is its own Android TV client, built for low-end TVs, with the layout
of [Wholphin](https://github.com/damontecres/Wholphin) and the Rawkoon look.
Each person on the TV gets a profile, with its own Rawkoon and Jellyfin
accounts. Its source and releases live in
[samuelloranger/rawkoon-tv](https://github.com/samuelloranger/rawkoon-tv).

## Before you start

An administrator needs to set up three things once. See
[Integrations → Jellyfin](/integrations#jellyfin) for the details.

1. Rawkoon v1.43.0 or later, with its Jellyfin integration configured.
2. **Quick Connect** turned on in Jellyfin (Dashboard → General → Quick
   Connect).
3. Your Rawkoon account linked to your Jellyfin user, in **Settings → Users**,
   in the Jellyfin column.

The TV needs Android 8 or later.

## Install

1. Allow the TV to install apps from unknown sources.
2. Download the APK from the
   [latest release](https://github.com/samuelloranger/rawkoon-tv/releases/latest)
   and install it, for example with a browser app such as Downloader, *Send
   files to TV*, or `adb install`.
3. Open RawkoonTV.

Release APKs are signed with this certificate (check with
`apksigner verify --print-certs`):

```
SHA-256 A2:71:9E:DC:5C:9D:1A:75:51:B0:A4:1D:02:7D:40:55:1E:14:DA:F1:2F:35:9F:F5:FA:1A:E3:8A:A9:83:AD:8B
```

## Sign in

The first launch asks for your Rawkoon address, then adds the first profile:

1. Enter your Rawkoon address.
2. The TV shows a code and a QR code. On your phone, scan it or open
   `/device` on your Rawkoon instance, sign in if asked, check that the code
   matches, and choose **Sign in**.
3. The TV finishes on its own: it reads your account, connects to the Jellyfin
   server Rawkoon names, and signs in to it through Quick Connect.

No Jellyfin password and no second server address. **Sign in with email and
password** on the code screen is the fallback when a phone is not at hand. A
code expires after 10 minutes; the TV offers a new one.

The TV gets a normal Rawkoon session, listed in **Settings → Sessions &
Tokens** and revocable there like any other.

## Profiles

**Who's watching?** opens on every launch. **Add** signs in another Rawkoon
account the same way, so everyone in the house gets their own Continue
watching, requests and settings for their home rows. **Manage profiles** sets
or clears a profile's PIN, or removes the profile from the TV (**Remove this
profile**). With a single
profile and no PIN, **Settings → Skip "Who's watching?" with one profile**
opens it straight away.

Updating from RawkoonTV 2.x turns its signed-in users into profiles, so nobody
signs in again.

## What's in it

- **Home.** Continue watching, Next up, the latest additions of each library,
  **Coming soon** (the next episodes and movies due in your library, with the
  episode numbers, `S2 · E3–5` when a day brings several) and **My requests**
  with their state. **Settings → Home rows** reorders or hides the rows, per
  profile.
- **Library.** Movies, Shows and Collections as poster grids with sorting,
  filters and a letter index; title pages, seasons and episodes; Search and
  Favorites.
- **Discover and request.** Trending, popular, and upcoming titles come from
  Rawkoon. Open one and request it; the title page shows whether it is pending,
  approved, downloading, or ready. Requests follow the same rules as on the web;
  see [Requests](/library/requests). A title you already have opens in the
  library instead.
- **Playback.** Jellyfin decides between direct play and transcoding for the
  TV. Trickplay previews when scrubbing, progress saved to Jellyfin, and the
  skip button for intros and credits that Jellyfin's media segments mark.
- **TV home screen.** **Watch Next** and a **Recently added** channel on the
  Android TV home screen; a card opens its title in the app. Profiles with a PIN
  keep their titles off the home screen.
- **Updates.** The app checks the RawkoonTV releases once a day and offers new
  versions in Settings. The first update asks Android for permission to install
  apps; after that an update is one click and keeps your profiles and settings.
  It needs free storage on the TV; when there is not enough, the app says how
  much is missing.

## Settings

All of them apply to the whole TV, except the home rows, which are per profile.

| Section | Settings |
| --- | --- |
| Home | Home rows, items per row, Next up limits, what OK does on Continue watching, the clock |
| Playback | Skip back and forward amounts, rewind when resuming, max bitrate, max resolution |
| Skipping | Intros, recaps, previews and credits: show the button, skip by themselves, or do nothing; play the next episode automatically, its countdown, and "Are you still watching?" |
| Subtitles | Size, colour, background, edge, direct play of PGS subtitles |
| Audio | Surround passthrough (AC3 / E-AC3), downmix to stereo |
| Display | Match the display to the video's frame rate (and resolution); HDR10, HDR10+ and Dolby Vision as the TV reports them, always allowed, or never allowed |
| Language | The TV's language, French, or English |
| Updates, Profiles, Storage, About | Check now and install, the daily check, skipping "Who's watching?", clearing the image cache, open-source licences |

Matching the frame rate only works on TVs that offer apps more than one display
mode; on the others the setting has no effect.

## When sign-in stops

| Message | Cause and fix |
| --- | --- |
| Rawkoon has no Jellyfin integration | Set up Jellyfin in **Settings → Integrations**. |
| This Jellyfin account is not linked to Rawkoon | An administrator links your account in **Settings → Users**. |
| The media server forgot the sign-in code | Quick Connect codes are short-lived, or Quick Connect is off. Turn it on in Jellyfin and try again. |
| Could not reach the media server | The TV cannot reach the Jellyfin address Rawkoon gave it. Jellyfin's **Website URL** in Rawkoon must be reachable from the TV. |
| Your Rawkoon session ended | The session was revoked or expired. Sign in again; the server address is kept. |

Report RawkoonTV bugs to
[rawkoon-tv](https://github.com/samuelloranger/rawkoon-tv/issues).
