// Watch-side storage. Keeps the last settings and courses the phone sent, so
// the app works on the course with no phone, plus which course is chosen.
// Watch only (uses @zos/storage); the phone side has its own settingsStorage.
import { LocalStorage } from '@zos/storage'
import { DEFAULTS, readClubs, parseJson } from './settings'
import { RUSH } from './rush'
import { byDistance } from './play'

const storage = new LocalStorage()

const CONFIG = 'config'         // { units, holes, clubs, courses } from the phone
const CHOICE = 'courseChoice'   // 'auto' (nearest) or a course id
const LAST_COURSE = 'lastCourse'
const LAST_POS = 'lastPos'      // [lat, lon]

function read(key, fallback) {
  try {
    return parseJson(storage.getItem(key), fallback)
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (e) {}
}

export function loadConfig() {
  const c = read(CONFIG, {}) || {}
  return {
    units: c.units === 'metres' ? 'metres' : DEFAULTS.units,
    holes: c.holes === '18' ? '18' : DEFAULTS.holes,
    clubs: readClubs(c.clubs),
    courses: Array.isArray(c.courses) ? c.courses : []
  }
}

// Saves what the phone sent; returns true if anything changed
export function saveConfig(config) {
  const before = JSON.stringify(read(CONFIG, {}))
  const after = JSON.stringify(config)
  if (before === after) return false
  write(CONFIG, config)
  return true
}

// Downloaded courses plus Rush, which is built in. A downloaded copy of
// Rush (same id) replaces the built-in one.
export function allCourses(config) {
  const list = config.courses.slice()
  if (!list.some((c) => c.id === RUSH.id)) list.push(RUSH)
  return list
}

export function getChoice() {
  return read(CHOICE, 'auto')
}

export function setChoice(choice) {
  write(CHOICE, choice)
  markChanged()
}

// Pages in API 3.0 have no onResume, so a page that changes the course sets
// this in-memory flag and the home page checks it (see page/home.js)
export function markChanged() {
  getApp()._options.globalData.courseChanged = true
}

export function takeChanged() {
  const data = getApp()._options.globalData
  const changed = Boolean(data.courseChanged)
  data.courseChanged = false
  return changed
}

export function getLastPos() {
  return read(LAST_POS, null)
}

export function setLastPos(pos) {
  write(LAST_POS, pos)
}

// The course to play: the one picked by hand, else the nearest to the last
// GPS fix, else the last one used, else Rush.
export function currentCourse(config) {
  const courses = allCourses(config)
  const choice = getChoice()
  let course = choice !== 'auto' && courses.find((c) => c.id === choice)
  if (!course) {
    const pos = getLastPos()
    if (pos) course = byDistance(courses, pos)[0].course
  }
  const last = read(LAST_COURSE, '')
  if (!course) course = courses.find((c) => c.id === last) || RUSH
  if (course.id !== last) write(LAST_COURSE, course.id)
  return course
}
