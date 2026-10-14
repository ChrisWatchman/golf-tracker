// Settings shared by the phone settings page, the phone side service and the
// watch. On the phone everything lives in settingsStorage as strings (JSON
// for objects); the watch keeps a copy of the parts it needs (see store.js).
import { DEFAULT_CLUBS } from './clubs'

export const YARDS_PER_METRE = 1.09361

// settingsStorage keys
export const KEY = {
  units: 'units',                   // 'yards' | 'metres'
  holes: 'holes',                   // '9' | '18' holes played
  clubs: 'clubs',                   // [{ name, yards }] longest first
  server: 'server',                 // course website address
  courses: 'courses',               // [course] downloaded courses (format v1)
  search: 'search',                 // request from the page: { q, at }
  searchResult: 'searchResult',     // { q, at, ok, error, items }
  download: 'download',             // request from the page: { id, at }
  downloadResult: 'downloadResult', // { id, at, ok, error }
  lastPos: 'lastPos'                // [lat, lon] last GPS fix the watch sent
}

export const DEFAULTS = {
  units: 'yards',
  holes: '9',
  // The live course website (../GolfCourseMapper on Cloudflare)
  server: 'https://course-mapper.watchgps.workers.dev'
}

export function parseJson(text, fallback) {
  if (text === undefined || text === null || text === '') return fallback
  if (typeof text !== 'string') return text
  try {
    return JSON.parse(text)
  } catch (e) {
    return fallback
  }
}

// Club list from storage, falling back to the defaults if missing or broken
export function readClubs(text) {
  const clubs = parseJson(text, null)
  const ok = Array.isArray(clubs) && clubs.length > 0 &&
    clubs.every((c) => c && typeof c.name === 'string' && c.yards > 0)
  return ok ? clubs : DEFAULT_CLUBS.map((c) => ({ ...c }))
}

// Distance for display: yards in, yards or metres out, whole numbers
export function toUnits(yards, units) {
  return units === 'metres' ? Math.round(yards / YARDS_PER_METRE) : Math.round(yards)
}

export function fromUnits(value, units) {
  return units === 'metres' ? Math.round(value * YARDS_PER_METRE) : Math.round(value)
}

export function unitLabel(units) {
  return units === 'metres' ? 'Metres' : 'Yards'
}
