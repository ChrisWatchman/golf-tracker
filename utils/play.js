// Turns a course (format v1, see course-format.js) and the 9/18 setting
// into the list of holes actually played.
import { distanceMetres } from './course-format'

// Returns [{ n, tees: [[lat, lon]], f, m, b }] in playing order.
//
// 9-hole course, 9 holes: holes 1-9. A hole's second-round tee (t2) also
//   starts it, so going round again still works (Rush: the 18th tee starts
//   hole 9).
// 9-hole course, 18 holes: holes 1-18; holes 10-18 reuse the greens of 1-9
//   and use the second-round tee where there is one.
// 18-hole course: holes 1-18, or the front nine when playing 9.
export function playHoles(course, holesSetting) {
  const holes = course.holes
  const want = holesSetting === '18' ? 18 : 9
  const out = []

  if (holes.length === 9 && want === 18) {
    for (let n = 1; n <= 18; n++) {
      const h = holes[(n - 1) % 9]
      const secondRound = n > 9 && h.t2 && h.t2.length
      out.push({ n, tees: secondRound ? h.t2 : h.t, f: h.f, m: h.m, b: h.b })
    }
    return out
  }

  const count = Math.min(want, holes.length)
  for (let n = 1; n <= count; n++) {
    const h = holes[n - 1]
    const tees = holes.length === 9 && h.t2 ? h.t.concat(h.t2) : h.t
    out.push({ n, tees, f: h.f, m: h.m, b: h.b })
  }
  return out
}

// Courses sorted nearest first from pos [lat, lon], each with metres added
export function byDistance(courses, pos) {
  return courses
    .map((c) => ({ course: c, metres: pos && c.c ? distanceMetres(pos, c.c) : Infinity }))
    .sort((a, b) => a.metres - b.metres)
}
