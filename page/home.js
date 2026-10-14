// Home: course name (tap to choose a course) and a hole picker.
// Playing 18 shows a 1-9 / 10-18 switch above the 3x3 grid.
// On open it asks the phone for the latest settings and courses; if the
// phone isn't there, the copy saved on the watch is used.
import { createWidget, widget, align, setStatusBarVisible, deleteWidget } from '@zos/ui'
import { push, replace } from '@zos/router'
import { Geolocation } from '@zos/sensor'
import { BasePage } from '@zeppos/zml/base-page'
import { loadConfig, saveConfig, currentCourse, getChoice, getLastPos, setLastPos, takeChanged } from '../utils/store'
import { playHoles } from '../utils/play'
import { distanceMetres } from '../utils/course-format'

// Only store a new position after moving this far, to spare storage writes
const POS_MIN_MOVE_METRES = 50
// How often to check whether a course was picked on the courses page
const CHANGE_CHECK_MS = 500

// Hole buttons; shorter when the 1-9 / 10-18 switch takes room, so the
// bottom row still clears the round screen's edge
const BTN = { w: 110, h: 76, gap: 10 }
const BTN_18 = { w: 110, h: 66, gap: 8 }

Page(
  BasePage({
    onInit() {
      this.config = loadConfig()
      this.course = currentCourse(this.config)
      this.holes = playHoles(this.course, this.config.holes)
      this.half = 0
      this.grid = []
    },

    build() {
      setStatusBarVisible(false)

      // Course name: tap to pick another course
      this.title = createWidget(widget.BUTTON, {
        x: 70, y: 40, w: 340, h: 56,
        text: this.course.name,
        text_size: 28,
        color: 0xffffff,
        normal_color: 0x000000,
        press_color: 0x1f3d12,
        radius: 12,
        click_func: () => push({ url: 'page/courses' })
      })

      this.sub = createWidget(widget.TEXT, {
        x: 90, y: 94, w: 300, h: 26,
        text: getChoice() === 'auto' ? 'Nearest course · tap to change' : 'Tap to change course',
        text_size: 16,
        color: 0x888888,
        align_h: align.CENTER_H
      })

      const eighteen = this.holes.length > 9
      this.halfButtons = []
      if (eighteen) this.drawHalfSwitch()

      this.gridTop = eighteen ? 174 : 140
      this.btn = eighteen ? BTN_18 : BTN
      this.drawGrid()

      this.requestConfig()
      this.startGps()
      this.changeTimer = setInterval(() => {
        if (takeChanged()) this.refreshIfChanged(true)
      }, CHANGE_CHECK_MS)
    },

    drawGrid() {
      this.grid.forEach((w) => deleteWidget(w))
      this.grid = []
      const b = this.btn
      const startX = (480 - (3 * b.w + 2 * b.gap)) / 2
      const first = this.half * 9
      this.holes.slice(first, first + 9).forEach((hole, i) => {
        const col = i % 3
        const rowN = Math.floor(i / 3)
        this.grid.push(createWidget(widget.BUTTON, {
          x: startX + col * (b.w + b.gap),
          y: this.gridTop + rowN * (b.h + b.gap),
          w: b.w,
          h: b.h,
          text: `${hole.n}`,
          text_size: 36,
          normal_color: 0x1f3d12,
          press_color: 0x3d7020,
          color: 0xffffff,
          radius: 12,
          click_func: () => push({ url: 'page/hole', params: JSON.stringify({ hole: hole.n }) })
        }))
      })
    },

    // 1-9 / 10-18 switch. Button colours can't be changed once drawn, so
    // the switch is redrawn when it changes.
    drawHalfSwitch() {
      this.halfButtons.forEach((w) => deleteWidget(w))
      this.halfButtons = [0, 1].map((half) => createWidget(widget.BUTTON, {
        x: half === 0 ? 125 : 245, y: 124, w: 110, h: 40,
        text: half === 0 ? '1–9' : '10–18',
        text_size: 22,
        radius: 20,
        color: 0xffffff,
        normal_color: half === this.half ? 0x3d7020 : 0x222222,
        press_color: 0x3d7020,
        click_func: () => this.showHalf(half)
      }))
    },

    showHalf(half) {
      if (half === this.half) return
      this.half = half
      this.drawHalfSwitch()
      this.drawGrid()
    },

    // Rebuild the page if the course or the hole count changed (or always,
    // when the course choice changed, so the subtitle is right too)
    refreshIfChanged(always) {
      const config = loadConfig()
      const course = currentCourse(config)
      const holes = playHoles(course, config.holes)
      if (always || course.id !== this.course.id || holes.length !== this.holes.length) {
        if (this.changeTimer) clearInterval(this.changeTimer)
        this.changeTimer = null
        replace({ url: 'page/home' })
      }
    },

    requestConfig() {
      this.request({ method: 'GET_CONFIG', params: { pos: getLastPos() } })
        .then((config) => {
          if (config && saveConfig(config)) this.refreshIfChanged()
        })
        .catch(() => {
          // No phone: carry on with the saved copy
        })
    },

    // Settings changed on the phone while this page is open
    onCall(data) {
      if (data && data.type === 'config' && data.config && saveConfig(data.config)) this.refreshIfChanged()
    },

    startGps() {
      const geo = new Geolocation()
      this.geo = geo
      this.onGps = () => {
        if (geo.getStatus() !== 'A') return
        const pos = [geo.getLatitude(), geo.getLongitude()]
        if (!isFinite(pos[0]) || !isFinite(pos[1])) return
        const last = getLastPos()
        if (last && distanceMetres(last, pos) < POS_MIN_MOVE_METRES) return
        setLastPos(pos)
        if (getChoice() === 'auto') this.refreshIfChanged()
      }
      geo.start()
      geo.onChange(this.onGps)
    },

    onDestroy() {
      if (this.changeTimer) clearInterval(this.changeTimer)
      if (this.geo) {
        this.geo.offChange(this.onGps)
        this.geo.stop()
      }
    }
  })
)
