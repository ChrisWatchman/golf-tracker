// Course file format, version 1. COPY of GolfCourseMapper/public/course-format.js
// (the website); keep the two in step. Used by the phone side service to check
// downloaded courses, and by the watch for distances.
//
// {
//   "v": 1,
//   "id": "rush-golf-club",          // set by the server from the name
//   "name": "Rush Golf Club",
//   "c": [53.5133, -6.1056],          // centre of the greens, set by the server
//   "updated": "2026-10-12T09:00:00Z", // set by the server
//   "holes": [                        // 9 or 18 holes, in playing order
//     {
//       "t":  [[lat, lon], ...],      // tee box(es); any of them starts the hole
//       "t2": [[lat, lon], ...],      // optional: tees used instead when a
//                                     // 9-hole course is played round again
//                                     // (e.g. Rush's 18th tee for hole 9)
//       "f": [lat, lon],              // front of green
//       "m": [lat, lon],              // middle of green
//       "b": [lat, lon]               // back of green
//     }
//   ]
// }
//
// Points are [lat, lon] arrays rounded to 6 decimals (about 10 cm), which
// keeps a 9-hole course to roughly 1 KB.

export const FORMAT_VERSION = 1
export const HOLE_COUNTS = [9, 18]
const NAME_MAX = 80

const round6 = (n) => Math.round(n * 1e6) / 1e6

function point(p) {
  if (!Array.isArray(p) || p.length !== 2) return null
  const [lat, lon] = p.map(Number)
  if (!isFinite(lat) || !isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return [round6(lat), round6(lon)]
}

function pointList(list) {
  if (!Array.isArray(list)) return null
  const out = list.map(point)
  return out.every(Boolean) ? out : null
}

// Returns { course } with a cleaned copy, or { errors: [...] }.
// Server-set fields (id, c, updated) are dropped; the caller adds them.
export function checkCourse(input) {
  const errors = []
  if (!input || typeof input !== 'object') return { errors: ['Not a course object'] }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) errors.push('Course needs a name')
  if (name.length > NAME_MAX) errors.push(`Name is longer than ${NAME_MAX} characters`)

  const holesIn = Array.isArray(input.holes) ? input.holes : []
  if (!HOLE_COUNTS.includes(holesIn.length)) {
    errors.push(`Course must have ${HOLE_COUNTS.join(' or ')} holes, not ${holesIn.length}`)
  }

  const holes = holesIn.map((h, i) => {
    const n = i + 1
    const hole = {}
    const t = pointList(h && h.t)
    if (!t || t.length === 0) errors.push(`Hole ${n}: needs at least one tee`)
    else hole.t = t
    if (h && h.t2 !== undefined && h.t2.length) {
      const t2 = pointList(h.t2)
      if (!t2) errors.push(`Hole ${n}: second-round tee is not a valid point`)
      else hole.t2 = t2
    }
    for (const [key, label] of [['f', 'front'], ['m', 'middle'], ['b', 'back']]) {
      const p = point(h && h[key])
      if (!p) errors.push(`Hole ${n}: needs a ${label} point`)
      else hole[key] = p
    }
    return hole
  })

  if (errors.length) return { errors }
  return { course: { v: FORMAT_VERSION, name, holes } }
}

// Centre of all the greens' middle points, used to find the nearest course
export function centreOf(course) {
  const ms = course.holes.map((h) => h.m)
  const lat = ms.reduce((s, p) => s + p[0], 0) / ms.length
  const lon = ms.reduce((s, p) => s + p[1], 0) / ms.length
  return [round6(lat), round6(lon)]
}

// Great-circle distance in metres
export function distanceMetres(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function slugify(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'course'
}
