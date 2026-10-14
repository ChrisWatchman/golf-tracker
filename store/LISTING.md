# Zepp store listing - Golf Tracker 2.0.0

Everything to paste into the release form at https://console.zepp.com.
Images are in this folder.

## Basics

| Field | Value |
|---|---|
| App name | Golf Tracker |
| Category | Sports (or Tools if Sports isn't offered) |
| Package | `release/Golf_Tracker-2.0.0.zab` (a copy of the `zeus build` output in `dist/`, which `zeus dev` clears) |
| Version | 2.0.0 (code 4), read from the package |
| Supported devices | Amazfit Balance, read from the package |
| Language | English |
| Icon | `icon-240.png` (240x240, round, transparent) |
| Screenshots | `screenshot-1-hole1.png` to `screenshot-4-courses.png` (360x360, round, transparent) |
| Permissions | Location (`device:os.geolocation`): GPS distances. Local storage (`device:os.local_storage`): courses and settings saved on the watch. |
| SDK in the package | Yes: `@zeppos/zml` 0.0.27 (Zepp's open-source messaging library, used for watch-phone communication) |
| Price | Free |
| Payment method (must be explained) | Optional donation only. The settings page in the Zepp app shows a PayPal QR code and an "Open in PayPal" link ("Buy me a coffee"). Nothing in the app is locked or paid; donating is entirely voluntary and handled by PayPal, outside the app. |

## App profile (short)

GPS distances to the front, middle and back of every green, with the club to hit.

## App details

Golf Tracker shows how far you are from the front, middle and back of the
green on every hole, using your watch's GPS, and suggests a club for each
distance based on your own average club distances.

- Big, easy-to-read yardages drawn over the green
- A club suggestion for the front, middle and back
- Moves on to the next hole by itself when you walk onto its tee, with a buzz
- Play 9 or 18 holes; 9-hole courses played twice can use different tees
- Picks the nearest course automatically, or choose one yourself
- Yards or metres
- Small clock on the hole screen
- Works without your phone once courses are on the watch
- Free, with no adverts; an optional "Buy me a coffee" link is in the settings

Courses come from the free course website at
https://course-mapper.watchgps.workers.dev. Anyone can map a course there on
satellite imagery and submit it; courses are checked before they're published.
Search for courses and download them to your watch from Golf Tracker's
settings in the Zepp app, and set your club distances there too.

Rush Golf Club is included.

## Privacy statement

Golf Tracker does not have accounts, adverts or analytics, and does not sell
or share your data.

Location: the app uses your watch's GPS while it is open to work out
distances to the greens and to pick the nearest course. Your most recent
position is saved on the watch and passed to Golf Tracker's settings in the
Zepp app on your phone, so course searches can be sorted by distance. When
you search for courses, that position (latitude and longitude) and your search
text are sent to the course website (course-mapper.watchgps.workers.dev) to
sort the results. The website does not store them; its hosting provider
(Cloudflare) may keep standard request logs for a short time.

Settings: your units, number of holes, club distances and downloaded courses
are stored in the Zepp app and on your watch only. Removing the app removes
them.

Donations: the settings page shows a "Buy me a coffee" PayPal QR code, loaded
from the course website. Donating is optional and happens on PayPal; the app
sends nothing to PayPal and doesn't know whether you donated.

Course website: if you submit a course on the website, the course map and the
optional name and note you enter are stored so the course can be reviewed and
published. The name you give is not published.

Contact: https://github.com/ChrisWatchman/golf-tracker/issues

## Release notes (2.0.0)

- Download courses from the course website through the phone settings
- Choose yards or metres, 9 or 18 holes, and your club distances on the phone
- Picks the nearest course automatically
- Club suggestion for every distance
