# Golf Tracker

A Zepp OS mini app for the Amazfit Balance that shows GPS distances to the
front, middle and back of each green, with a club suggestion for each.

- Distances in yards or metres, drawn over a green on the 480x480 round screen
- A suggested club for each distance, from your own average club distances
- Moves on to the next hole by itself when you reach its tee, with a buzz
- 9 or 18 holes; a 9-hole course played as 18 can use different tees on the
  second nine
- Picks the nearest course on the watch automatically, or choose one
- Works with no phone once courses are on the watch; Rush Golf Club is built in
- Small 24-hour clock at the bottom of the hole screen

Courses come from the course website
(https://course-mapper.watchgps.workers.dev), where anyone can map a course on
satellite imagery and submit it for review.

## Phone settings

In the Zepp app, open Golf Tracker's settings to:

- choose yards or metres, and 9 or 18 holes
- search the course website, download courses to the watch, and remove them
- set your average distance for each club
- change the course website address

## Building

Needs the [Zeus CLI](https://docs.zepp.com/docs/guides/tools/cli/) and Node.

```bash
npm install
zeus build      # package in dist/
zeus dev        # run in the Zepp OS Simulator
zeus preview    # QR code to install on a watch through the Zepp app
```

Targets Zepp OS API 3.0. Messaging between the watch and phone uses
[`@zeppos/zml`](https://www.npmjs.com/package/@zeppos/zml), pinned to 0.0.27
(later versions need API 3.6).

## Layout

| Path | What |
|---|---|
| `page/home.js` | Course name and hole picker |
| `page/courses.js` | Choose a course |
| `page/hole.js` | Distances, clubs, auto-advance, clock |
| `setting/index.js` | Settings page in the Zepp phone app |
| `app-side/index.js` | Phone side service: talks to the course website and the watch |
| `utils/` | Course format, club logic, settings, watch storage, built-in Rush |

## Course format

Courses are small JSON files (about 1 KB for nine holes): for each hole, one
or more tees and the front, middle and back of the green as `[lat, lon]`.
See `utils/course-format.js`.

## Buy me a coffee

Golf Tracker and the course website are free, with no adverts. If they help
your game, you can say thanks with a coffee: scan the code with your phone or
the PayPal app, or [open it in PayPal](https://www.paypal.com/qrcodes/p2pqrc/H52JSEGSFXPPW).

<img src="docs/buy-me-a-coffee.png" width="200" alt="PayPal QR code to buy me a coffee">

## Licence

MIT - see [LICENSE](LICENSE).
