// Choose the course: "Nearest" (automatic) or any course on the watch,
// nearest first. Long lists scroll.
import { createWidget, widget, align, event, setStatusBarVisible } from '@zos/ui'
import { back } from '@zos/router'
import { loadConfig, allCourses, getChoice, setChoice, getLastPos } from '../utils/store'
import { byDistance } from '../utils/play'

const ROW = { x: 60, w: 360, h: 72, gap: 10 }

function distanceText(metres, units) {
  if (!isFinite(metres)) return ''
  if (units === 'metres') return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`
  const miles = metres / 1609.34
  return miles < 0.5 ? `${Math.round(metres * 1.09361)} yd` : `${miles.toFixed(miles < 10 ? 1 : 0)} mi`
}

Page({
  build() {
    setStatusBarVisible(false)
    const config = loadConfig()
    const choice = getChoice()
    const list = byDistance(allCourses(config), getLastPos())

    createWidget(widget.TEXT, {
      x: 0, y: 30, w: 480, h: 50,
      text: 'Courses',
      text_size: 34,
      color: 0xffffff,
      align_h: align.CENTER_H
    })

    const rows = [{ id: 'auto', name: 'Nearest course', meta: 'Chosen automatically' }]
      .concat(list.map(({ course, metres }) => ({
        id: course.id,
        name: course.name,
        meta: [`${course.holes.length} holes`, distanceText(metres, config.units)].filter(Boolean).join(' · ')
      })))

    rows.forEach((r, i) => {
      const y = 100 + i * (ROW.h + ROW.gap)
      const selected = r.id === choice
      const pick = () => {
        setChoice(r.id)
        back()
      }
      createWidget(widget.BUTTON, {
        ...ROW, y,
        text: '',
        radius: 14,
        normal_color: selected ? 0x3d7020 : 0x1f3d12,
        press_color: 0x4c8a2a,
        click_func: pick
      })
      // The labels sit on top of the button, so they take taps too
      const name = createWidget(widget.TEXT, {
        x: ROW.x + 16, y: y + 6, w: ROW.w - 32, h: 34,
        text: r.name,
        text_size: 26,
        color: 0xffffff,
        align_h: align.CENTER_H
      })
      const meta = createWidget(widget.TEXT, {
        x: ROW.x + 16, y: y + 40, w: ROW.w - 32, h: 26,
        text: r.meta,
        text_size: 18,
        color: 0xc8dcc0,
        align_h: align.CENTER_H
      })
      name.addEventListener(event.CLICK_UP, pick)
      meta.addEventListener(event.CLICK_UP, pick)
    })

    // Room to scroll the last row up past the round screen's bottom edge
    createWidget(widget.FILL_RECT, {
      x: 0, y: 100 + rows.length * (ROW.h + ROW.gap), w: 480, h: 120, color: 0x000000
    })
  }
})
