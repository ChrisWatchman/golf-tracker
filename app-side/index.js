// Phone side service. Runs inside the Zepp app; the phone starts it when the
// settings change (zml handles that launch) and while the watch app is open.
//
// - The settings page asks for a search or download by writing KEY.search or
//   KEY.download; this service does the fetch from the course website and
//   writes the answer back (KEY.searchResult, KEY.downloadResult, KEY.courses).
// - The watch asks for GET_CONFIG when it opens and gets units, holes, clubs
//   and downloaded courses. It sends its last GPS fix so searches can be
//   sorted nearest first.
// - When a setting the watch uses changes, the new config is pushed to the
//   watch if it's listening.
import { BaseSideService, settingsLib } from '@zeppos/zml/base-side'
import { KEY, DEFAULTS, parseJson, readClubs } from '../utils/settings'
import { checkCourse } from '../utils/course-format'

const WATCH_KEYS = [KEY.units, KEY.holes, KEY.clubs, KEY.courses]

function get(key, fallback) {
  return parseJson(settingsLib.getItem(key), fallback)
}

function set(key, value) {
  settingsLib.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}

function serverUrl() {
  const s = (settingsLib.getItem(KEY.server) || DEFAULTS.server).trim()
  return s.replace(/\/+$/, '')
}

function configForWatch() {
  return {
    units: settingsLib.getItem(KEY.units) === 'metres' ? 'metres' : DEFAULTS.units,
    holes: settingsLib.getItem(KEY.holes) === '18' ? '18' : DEFAULTS.holes,
    clubs: readClubs(settingsLib.getItem(KEY.clubs)),
    courses: get(KEY.courses, [])
  }
}

async function getJson(service, url) {
  const res = await service.fetch({ url, method: 'GET' })
  const body = typeof res.body === 'string' ? parseJson(res.body, null) : res.body
  if (res.status && res.status >= 400) {
    throw new Error((body && body.error) || `The website answered ${res.status}`)
  }
  if (body === null || body === undefined) throw new Error('The website sent an empty answer')
  return body
}

function friendly(error, server) {
  const msg = (error && error.message) || String(error)
  if (/timeout|network|fail|refused|connect/i.test(msg)) {
    return `Can't reach the course website at ${server}. Check the address below and that the phone can reach it.`
  }
  return msg
}

AppSideService(
  BaseSideService({
    onInit() {
      // Pick up requests made while the service wasn't running
      this.handleSearch(true)
      this.handleDownload(true)
    },

    onRun() {},

    onDestroy() {},

    onSettingsChange({ key }) {
      if (key === KEY.search) this.handleSearch()
      else if (key === KEY.download) this.handleDownload()
      if (WATCH_KEYS.includes(key)) this.pushToWatch()
    },

    onRequest(req, res) {
      if (req.method === 'GET_CONFIG') {
        const pos = req.params && req.params.pos
        if (Array.isArray(pos) && pos.length === 2) set(KEY.lastPos, pos)
        res(null, configForWatch())
      } else {
        res({ message: `Unknown request ${req.method}` })
      }
    },

    pushToWatch() {
      try {
        const sent = this.call({ type: 'config', config: configForWatch() })
        if (sent && sent.catch) sent.catch(() => {})
      } catch (e) {
        // Watch app not open; it asks for the config when it starts
      }
    },

    // onlyIfPending: on start-up, only answer a request that has no answer yet
    async handleSearch(onlyIfPending) {
      const req = get(KEY.search, null)
      if (!req) return
      const done = get(KEY.searchResult, null)
      if (onlyIfPending && done && done.at === req.at) return

      const server = serverUrl()
      const q = (req.q || '').trim()
      const pos = get(KEY.lastPos, null)
      let url = `${server}/api/courses?q=${encodeURIComponent(q)}`
      if (Array.isArray(pos)) url += `&lat=${pos[0]}&lon=${pos[1]}`

      try {
        const items = await getJson(this, url)
        if (!Array.isArray(items)) throw new Error('The website sent something that is not a course list')
        set(KEY.searchResult, { q, at: req.at, ok: true, items })
      } catch (e) {
        set(KEY.searchResult, { q, at: req.at, ok: false, error: friendly(e, server), items: [] })
      }
    },

    async handleDownload(onlyIfPending) {
      const req = get(KEY.download, null)
      if (!req || !req.id) return
      const done = get(KEY.downloadResult, null)
      if (onlyIfPending && done && done.at === req.at) return

      const server = serverUrl()
      try {
        const file = await getJson(this, `${server}/api/courses/${encodeURIComponent(req.id)}`)
        const { course, errors } = checkCourse(file)
        if (errors) throw new Error(`The course file is incomplete: ${errors[0]}`)
        // Keep the server's id, centre and date alongside the checked holes
        const saved = { ...course, id: file.id, c: file.c, updated: file.updated }
        const courses = get(KEY.courses, []).filter((c) => c.id !== saved.id)
        courses.push(saved)
        courses.sort((a, b) => a.name.localeCompare(b.name))
        set(KEY.courses, courses)
        set(KEY.downloadResult, { id: req.id, at: req.at, ok: true, name: saved.name })
        this.pushToWatch()
      } catch (e) {
        set(KEY.downloadResult, { id: req.id, at: req.at, ok: false, error: friendly(e, server) })
      }
    }
  })
)
