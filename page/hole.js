// Swipe left  = next hole (the last hole wraps to 1)
// Swipe right = previous hole (on hole 1, returns to the menu)
// Course, 9/18 holes, yards/metres and club distances come from the phone
// settings (saved on the watch, see utils/store.js).
// Holes change in place, so GPS keeps running between holes.
// Walking onto the next hole's tee box also moves on to that hole, with a buzz.
import { createWidget, widget, align, prop, setStatusBarVisible } from '@zos/ui'
import { Geolocation, Time, Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { onGesture, offGesture, GESTURE_LEFT, GESTURE_RIGHT } from '@zos/interaction'
import { setPageBrightTime, setWakeUpRelaunch } from '@zos/display'
import { clubFor } from '../utils/clubs'
import { loadConfig, currentCourse, getLastPos, setLastPos } from '../utils/store'
import { playHoles } from '../utils/play'
import { YARDS_PER_METRE, toUnits, unitLabel } from '../utils/settings'

// Only store a new position after moving this far, to spare storage writes
const POS_MIN_MOVE_METRES = 50

// Added to every front/middle/back distance (and so to the club choice).
// Set after a round where the pins played about 2 yards long.
const GREEN_OFFSET_YARDS = 2

// Auto-advance when within this distance of the next hole's tee
const TEE_RADIUS_YARDS = 10
// After a manual swipe, auto-advance waits until you're this far from the
// next tee, so swiping back while standing on a tee doesn't bounce forward
const TEE_REARM_YARDS = 20

// Organic green shape built from overlapping circles (no image file needed).
// Each circle is drawn larger in the fringe colour first, then the putting
// surface on top, so the union gets an even collar all round.
// A few large circles give a smooth kidney shape; small ones look like a cloud.
const GREEN_BLOB = [
  { x: 240, y: 250, r: 160 }, // body
  { x: 175, y: 290, r: 115 }, // front-left lobe
  { x: 305, y: 215, r: 115 }  // back-right lobe
]
const FRINGE_WIDTH = 10
const FRINGE_COLOR = 0x5ab030
const SURFACE_COLOR = 0x2a6b1c

function toRad(d) {
  return (d * Math.PI) / 180
}

// Haversine distance in metres
function distanceMetres(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// point is [lat, lon] (course format v1)
function yardsTo(lat, lon, point) {
  return Math.round(distanceMetres(lat, lon, point[0], point[1]) * YARDS_PER_METRE)
}

function greenYards(lat, lon, point) {
  return yardsTo(lat, lon, point) + GREEN_OFFSET_YARDS
}

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

// GPS may return decimal degrees or a DMS object
// ({ degrees, minutes, seconds, direction }). Handle both, and
// make west/south negative so Irish longitudes come out correct.
function toDecimal(v) {
  if (typeof v === 'number') return v
  if (v && typeof v.degrees === 'number') {
    const dec = v.degrees + (v.minutes || 0) / 60 + (v.seconds || 0) / 3600
    return v.direction === 'W' || v.direction === 'S' ? -dec : dec
  }
  return NaN
}

function drawGreen() {
  GREEN_BLOB.forEach(({ x, y, r }) => {
    createWidget(widget.CIRCLE, { center_x: x, center_y: y, radius: r + FRINGE_WIDTH, color: FRINGE_COLOR })
  })
  GREEN_BLOB.forEach(({ x, y, r }) => {
    createWidget(widget.CIRCLE, { center_x: x, center_y: y, radius: r, color: SURFACE_COLOR })
  })
}

function makeLabel(y, text) {
  createWidget(widget.TEXT, {
    x: 140, y, w: 200, h: 24,
    text,
    text_size: 20,
    color: 0xe8e8e8,
    align_h: align.CENTER_H
  })
}

// A distance with its club to the right. The number is right-aligned so
// the club always sits just after it, inside the green.
function makeRow(y, size, color) {
  const h = size + 12
  const value = createWidget(widget.TEXT, {
    x: 0, y, w: 282, h,
    text: '---',
    text_size: size,
    color,
    align_h: align.RIGHT,
    align_v: align.CENTER_V
  })
  const club = createWidget(widget.TEXT, {
    x: 292, y, w: 100, h,
    text: '',
    text_size: 34,
    color: 0xdddddd,
    align_h: align.LEFT,
    align_v: align.CENTER_V
  })
  return { value, club }
}

Page({
  onInit(params) {
    let hole = 1
    try {
      hole = JSON.parse(params || '{}').hole || 1
    } catch (e) {
      hole = 1
    }
    this.config = loadConfig()
    this.course = currentCourse(this.config)
    this.holes = playHoles(this.course, this.config.holes)
    if (hole < 1 || hole > this.holes.length) hole = 1
    this.state = { hole, geo: null, lat: null, lon: null, fix: false, autoArmed: true, ui: {} }
  },

  // The last hole wraps to 1, handy for going round again
  nextHole(hole) {
    return hole < this.holes.length ? hole + 1 : 1
  },

  build() {
    setStatusBarVisible(false)

    // Keep the screen on for 60 s, and reopen this page on wrist raise
    setPageBrightTime({ brightTime: 60000 })
    setWakeUpRelaunch({ relaunch: true })

    const ui = this.state.ui

    ui.title = createWidget(widget.TEXT, {
      x: 0, y: 28, w: 480, h: 56,
      text: `Hole ${this.state.hole}`,
      text_size: 44,
      color: 0xffffff,
      align_h: align.CENTER_H
    })

    drawGreen()

    // Distances on the green: back at the top, front at the bottom.
    // Middle is the one you play to most, so it's the largest.
    makeLabel(106, 'BACK')
    ui.back = makeRow(124, 60, 0xffaa00)

    makeLabel(198, 'MIDDLE')
    ui.middle = makeRow(214, 76, 0xffffff)

    makeLabel(302, 'FRONT')
    ui.front = makeRow(318, 60, 0x00ffff)

    ui.status = createWidget(widget.TEXT, {
      x: 0, y: 416, w: 480, h: 26,
      text: 'Waiting for GPS...',
      text_size: 18,
      color: 0x888888,
      align_h: align.CENTER_H
    })

    // Small 24-hour clock at the bottom, updated every minute
    ui.clock = createWidget(widget.TEXT, {
      x: 0, y: 442, w: 480, h: 26,
      text: '',
      text_size: 20,
      color: 0x888888,
      align_h: align.CENTER_H
    })
    this.time = new Time()
    this.renderClock()
    this.time.onPerMinute(() => this.renderClock())

    onGesture({ callback: (event) => this.onSwipe(event) })

    this.startGps()
  },

  onSwipe(event) {
    const hole = this.state.hole
    if (event === GESTURE_LEFT) {
      this.state.autoArmed = false
      this.showHole(this.nextHole(hole))
      return true
    }
    if (event === GESTURE_RIGHT && hole > 1) {
      this.state.autoArmed = false
      this.showHole(hole - 1)
      return true
    }
    return false // let the system handle it (back to menu from hole 1)
  },

  showHole(n) {
    this.state.hole = n
    this.state.ui.title.setProperty(prop.TEXT, `Hole ${n}`)
    this.render()
  },

  startGps() {
    const geo = new Geolocation()
    this.state.geo = geo

    this.onGpsChange = () => {
      if (geo.getStatus() === 'A') {
        const lat = toDecimal(geo.getLatitude())
        const lon = toDecimal(geo.getLongitude())
        if (isFinite(lat) && isFinite(lon)) {
          this.state.lat = lat
          this.state.lon = lon
          this.state.fix = true
          this.rememberPosition(lat, lon)
          this.checkNextTee()
        }
      } else {
        this.state.fix = false
      }
      this.render()
    }

    geo.start()
    geo.onChange(this.onGpsChange)
    this.onGpsChange()
  },

  // Saved for choosing the nearest course and sorting searches on the phone
  rememberPosition(lat, lon) {
    const last = getLastPos()
    if (last && distanceMetres(last[0], last[1], lat, lon) < POS_MIN_MOVE_METRES) return
    setLastPos([lat, lon])
  },

  // Only the next hole's tees are checked, so walking past other tees on
  // the course never changes the hole
  checkNextTee() {
    const { lat, lon, hole } = this.state
    const next = this.nextHole(hole)
    // Nearest of the next hole's tees (some holes have more than one)
    const yards = Math.min(...this.holes[next - 1].tees.map((tee) => yardsTo(lat, lon, tee)))

    if (!this.state.autoArmed) {
      if (yards > TEE_REARM_YARDS) this.state.autoArmed = true
      return
    }
    if (yards <= TEE_RADIUS_YARDS) {
      this.state.hole = next
      this.state.ui.title.setProperty(prop.TEXT, `Hole ${next}`)
      this.buzz()
    }
  },

  // Two short pulses, like a message notification. A vibration failure
  // must never stop the hole changing, so errors are ignored.
  buzz() {
    try {
      if (!this.vibrator) this.vibrator = new Vibrator()
      this.vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
    } catch (e) {}
  },

  renderClock() {
    const t = this.time
    this.state.ui.clock.setProperty(prop.TEXT, `${pad2(t.getHours())}:${pad2(t.getMinutes())}`)
  },

  render() {
    const { lat, lon, hole, fix, ui } = this.state

    const rows = [[ui.front, 'f'], [ui.middle, 'm'], [ui.back, 'b']]

    if (lat === null) {
      rows.forEach(([row]) => {
        row.value.setProperty(prop.TEXT, '---')
        row.club.setProperty(prop.TEXT, '')
      })
      ui.status.setProperty(prop.TEXT, 'Waiting for GPS...')
      return
    }

    // Clubs are always worked out in yards; only the shown number changes
    const { units, clubs } = this.config
    const green = this.holes[hole - 1]
    rows.forEach(([row, pin]) => {
      const yards = greenYards(lat, lon, green[pin])
      row.value.setProperty(prop.TEXT, `${toUnits(yards, units)}`)
      row.club.setProperty(prop.TEXT, clubFor(yards, clubs))
    })
    const label = unitLabel(units)
    ui.status.setProperty(prop.TEXT, fix ? label : `${label} (last known position)`)
  },

  onDestroy() {
    offGesture()
    if (this.vibrator) this.vibrator.stop()
    const geo = this.state.geo
    if (geo) {
      geo.offChange(this.onGpsChange)
      geo.stop()
    }
  }
})
