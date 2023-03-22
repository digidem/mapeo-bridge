/** Generate random color */
function getRandomColor () {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

/** Get center of coords */

function rad2degr (rad) { return rad * 180 / Math.PI }
function degr2rad (degr) { return degr * Math.PI / 180 }

/**
 * @param latLngInDeg array of arrays with latitude and longtitude
 *   pairs in degrees. e.g. [[latitude1, longtitude1], [latitude2
 *   [longtitude2] ...]
 *
 * @return array with the center latitude longtitude pairs in
 *   degrees.
 */
function getLatLngCenter (latLngInDegr) {
  const LATIDX = 0
  const LNGIDX = 1
  let sumX = 0
  let sumY = 0
  let sumZ = 0

  for (let i = 0; i < latLngInDegr.length; i++) {
    var lat = degr2rad(latLngInDegr[i][LATIDX])
    var lng = degr2rad(latLngInDegr[i][LNGIDX])
    // sum of cartesian coordinates
    sumX += Math.cos(lat) * Math.cos(lng)
    sumY += Math.cos(lat) * Math.sin(lng)
    sumZ += Math.sin(lat)
  }

  const avgX = sumX / latLngInDegr.length
  const avgY = sumY / latLngInDegr.length
  const avgZ = sumZ / latLngInDegr.length

  // convert average x, y, z coordinate to latitude and longtitude
  var lng = Math.atan2(avgY, avgX)
  const hyp = Math.sqrt(avgX * avgX + avgY * avgY)
  var lat = Math.atan2(avgZ, hyp)

  return ([rad2degr(lat), rad2degr(lng)])
}

/** Slugify */
function slugify (text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

/** delete observation */
async function deleteObservation (observationId) {
  const deleteButton = document.getElementById(`delete-button-${observationId}`)
  deleteButton.classList.add = 'hidden'
  await observationsToMarkers({ noFly: true, filter: true })
  deleteButton.classList.remove = 'hidden'
}

/** check is in filter */
function checkIsFiltered (obs, filter) {
  if (filter) return obs.tags?.type === 'network'
  else return obs
}
async function observationsToMarkers ({ noFly, filter }) {
  const map = window.mapboxMap
  try {
    // Get local storage
    const localObs = window.localStorage.getItem('mapeo-obs')
    const parsedObs = JSON.parse(localObs)
    if (parsedObs) await generateHtml(parsedObs)
    const getMapeoData = await axios.get('/mapeo')
    const mapeoData = getMapeoData.data
    // Set local storage
    window.localStorage.setItem('mapeo-obs', JSON.stringify(mapeoData))
    /** generate the html */
    await generateHtml(mapeoData, noFly, filter)
  } catch (err) {
    console.log('Error', err)
  }
}
