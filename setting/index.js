// Golf Tracker settings, shown in the Zepp app on the phone.
// Everything is saved in settingsStorage. Searches and downloads are done by
// the side service (app-side/index.js): this page writes a request and shows
// the answer when it arrives (the page is rebuilt whenever storage changes).
import { KEY, DEFAULTS, parseJson, readClubs, toUnits, fromUnits, unitLabel } from '../utils/settings'
import { DEFAULT_CLUBS, CLUB_NAMES } from '../utils/clubs'
import { RUSH } from '../utils/rush'

const GREEN = '#2e7d32'
const MUTED = '#667064'
const LINE = '#e3e8e0'
const ERROR = '#b3261e'

const card = { background: '#ffffff', borderRadius: '10px', padding: '4px 14px', marginBottom: '14px' }
const row = { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${LINE}` }
const smallButton = { fontSize: '13px', borderRadius: '16px', padding: '0 14px', height: '32px', lineHeight: '32px' }

// Buy me a coffee: PayPal QR (hosted on the course website) and its link
const COFFEE_QR = 'https://course-mapper.watchgps.workers.dev/coffee-qr.png'
const COFFEE_LINK = 'https://www.paypal.com/qrcodes/p2pqrc/H52JSEGSFXPPW'

// Text renders inline by default; blocks make each piece its own line
function text(content, style = {}) {
  return Text({ style: { display: 'block', fontSize: '14px', color: '#1d2a1b', ...style } }, [content])
}

function heading(title, note) {
  return View({ style: { margin: '18px 4px 8px' } }, [
    text(title, { fontSize: '13px', fontWeight: 'bold', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' }),
    note ? text(note, { fontSize: '13px', color: MUTED, marginTop: '4px' }) : null
  ].filter(Boolean))
}

function courseRow(name, meta, button) {
  return View({ style: row }, [
    View({ style: { flex: 1, paddingRight: '10px' } }, [
      text(name, { fontWeight: 'bold' }),
      text(meta, { fontSize: '12px', color: MUTED, marginTop: '2px' })
    ]),
    button || null
  ].filter(Boolean))
}

AppSettingsPage({
  build(props) {
    const store = props.settingsStorage
    const get = (key, fallback) => parseJson(store.getItem(key), fallback)
    const set = (key, value) => store.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))

    // Select only shows its value when bound with settingsKey, which reads
    // storage; store the defaults so the choices show on first open
    if (!store.getItem(KEY.units)) set(KEY.units, DEFAULTS.units)
    if (!store.getItem(KEY.holes)) set(KEY.holes, DEFAULTS.holes)

    const units = store.getItem(KEY.units) === 'metres' ? 'metres' : DEFAULTS.units
    const clubs = readClubs(store.getItem(KEY.clubs))
    const server = store.getItem(KEY.server) || DEFAULTS.server
    const courses = get(KEY.courses, [])
    const search = get(KEY.search, null)
    const searchResult = get(KEY.searchResult, null)
    const download = get(KEY.download, null)
    const downloadResult = get(KEY.downloadResult, null)
    const unit = units === 'metres' ? 'm' : 'yd'

    const searching = search && (!searchResult || searchResult.at !== search.at)
    const downloadingId = download && (!downloadResult || downloadResult.at !== download.at) ? download.id : null
    const onWatch = (id) => courses.find((c) => c.id === id)

    // ---------- watch settings ----------
    const watchSettings = View({ style: card }, [
      Select({
        label: 'Distances in',
        options: [{ name: 'Yards', value: 'yards' }, { name: 'Metres', value: 'metres' }],
        settingsKey: KEY.units
      }),
      Select({
        label: 'Holes played',
        options: [{ name: '9 holes', value: '9' }, { name: '18 holes', value: '18' }],
        settingsKey: KEY.holes
      })
    ])

    // ---------- courses on the watch ----------
    const courseRows = courses.map((c) =>
      courseRow(c.name, `${c.holes.length} holes · downloaded`, Button({
        label: 'Remove',
        style: { ...smallButton, background: '#fbe9e7', color: ERROR },
        onClick: () => set(KEY.courses, courses.filter((x) => x.id !== c.id))
      }))
    )
    if (!onWatch(RUSH.id)) {
      courseRows.push(courseRow(RUSH.name, `${RUSH.holes.length} holes · built in`))
    }
    const onWatchCard = View({ style: card }, courseRows)

    // ---------- find courses ----------
    const findChildren = [
      TextInput({
        label: 'Search',
        placeholder: 'Course name (blank for all)',
        value: (search && search.q) || '',
        onChange: (q) => set(KEY.search, { q: (q || '').trim(), at: Date.now() })
      }),
      View({ style: { padding: '10px 0', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' } }, [
        Button({
          label: searching ? 'Searching…' : 'Search',
          style: { ...smallButton, background: GREEN, color: '#ffffff' },
          onClick: () => set(KEY.search, { q: (search && search.q) || '', at: Date.now() })
        })
      ])
    ]

    if (searchResult && !searching) {
      if (!searchResult.ok) {
        findChildren.push(text(searchResult.error, { color: ERROR, padding: '0 0 12px' }))
      } else if (!searchResult.items.length) {
        findChildren.push(text(searchResult.q ? `No courses match "${searchResult.q}".` : 'The website has no courses yet.', { color: MUTED, padding: '0 0 12px' }))
      } else {
        searchResult.items.forEach((item) => {
          const have = onWatch(item.id)
          const fresh = have && have.updated === item.updated
          const busy = downloadingId === item.id
          const failed = downloadResult && downloadResult.id === item.id && !downloadResult.ok && !busy
          const meta = [`${item.holes} holes`]
          if (item.km !== undefined) meta.push(`${item.km < 10 ? item.km : Math.round(item.km)} km away`)
          if (fresh) meta.push('on your watch')
          else if (have) meta.push('newer version available')
          findChildren.push(courseRow(item.name, meta.join(' · '), Button({
            label: busy ? 'Downloading…' : fresh ? 'Downloaded' : have ? 'Update' : 'Download',
            style: { ...smallButton, background: fresh ? '#eef2ec' : GREEN, color: fresh ? MUTED : '#ffffff' },
            onClick: () => {
              if (!busy) set(KEY.download, { id: item.id, at: Date.now() })
            }
          })))
          if (failed) findChildren.push(text(downloadResult.error, { color: ERROR, fontSize: '12px', padding: '4px 0 8px' }))
        })
        findChildren.push(text(
          searchResult.items.some((i) => i.km !== undefined) ? 'Nearest first, from where your watch last had GPS.' : 'A–Z. Open Golf Tracker on the watch outdoors to sort nearest first.',
          { fontSize: '12px', color: MUTED, padding: '10px 0' }
        ))
      }
    }
    const findCard = View({ style: card }, findChildren)

    // ---------- clubs ----------
    const clubRows = clubs.map((club, i) =>
      TextInput({
        label: CLUB_NAMES[club.name] ? `${CLUB_NAMES[club.name]} (${club.name})` : club.name,
        value: `${toUnits(club.yards, units)}`,
        onChange: (value) => {
          const n = parseFloat(value)
          if (!isFinite(n) || n <= 0 || n > 400) return
          const next = clubs.map((c) => ({ ...c }))
          next[i].yards = fromUnits(n, units)
          set(KEY.clubs, next)
        }
      })
    )
    clubRows.push(View({ style: { padding: '10px 0', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' } }, [
      Button({
        label: 'Reset to defaults',
        style: { ...smallButton, background: '#eef2ec', color: MUTED },
        onClick: () => set(KEY.clubs, DEFAULT_CLUBS)
      })
    ]))
    const clubCard = View({ style: card }, clubRows)

    // ---------- website ----------
    const serverCard = View({ style: card }, [
      TextInput({
        label: 'Website address',
        value: server,
        onChange: (value) => set(KEY.server, (value || '').trim() || DEFAULTS.server)
      })
    ])

    return View({ style: { padding: '8px 14px 30px', background: '#f6f7f4' } }, [
      View({ style: { margin: '10px 4px 4px' } }, [
        text('Golf Tracker', { fontSize: '22px', fontWeight: 'bold' }),
        text('Green distances and club suggestions on your watch. Changes reach the watch when Golf Tracker opens, or straight away if its hole list is showing.', { fontSize: '13px', color: MUTED, marginTop: '4px' })
      ]),
      heading('On the watch'),
      watchSettings,
      heading('Courses on your watch', 'The watch picks the nearest one automatically; you can also choose on the watch.'),
      onWatchCard,
      heading('Find courses', 'From the course website. Download a course to send it to the watch.'),
      findCard,
      heading(`Club distances (${unit})`, `Your average carry with each club, in ${unitLabel(units).toLowerCase()}. Tap a club to change it.`),
      clubCard,
      heading('Course website', 'Where courses are searched and downloaded from. Your phone must be able to reach it.'),
      serverCard,
      heading('Buy me a coffee', 'Golf Tracker is free, with no adverts. If it helps your game, you can say thanks with a coffee.'),
      View({ style: { ...card, padding: '14px', textAlign: 'center' } }, [
        Image({ src: COFFEE_QR, width: 180, height: 180, alt: 'PayPal QR code' }),
        text('Scan with another phone or the PayPal app, or tap below.', { fontSize: '12px', color: MUTED, margin: '6px 0 10px' }),
        Link({ source: COFFEE_LINK }, [text('Open in PayPal', { color: GREEN, fontWeight: 'bold' })])
      ])
    ])
  }
})
