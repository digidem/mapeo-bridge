/** get observations and create markers */
const currentMarkers = []
let currentLines = []
const categoryIndex = {}

function clearMarkers () {
  if (currentLines !== null) {
    currentLines.forEach((l) => {
      window.mapboxMap.removeLayer(l)
      currentLines = []
    })
  }
  if (currentMarkers !== null) {
    for (let i = currentMarkers.length - 1; i >= 0; i--) {
      currentMarkers[i].remove()
    }
  }
}

function generateMarker (mapeoObs, markerEl, popupContent) {
  const popup = new mapboxgl.Popup({ offset: [0, -45] }).setHTML(popupContent)
  markerEl.addEventListener('click', () => {
    if (map.getZoom() < 18) {
      map.easeTo({
        center: [mapeoObs.lon, mapeoObs.lat],
        zoom: 18,
        speed: 0.2,
        curve: 1,
        duration: 2500,
        easing (t) {
          return t
        }
      })
    }
  })
  const marker = new mapboxgl.Marker(markerEl)
    .setPopup(popup) // add popup
    .setLngLat([mapeoObs.lon, mapeoObs.lat])
    .addTo(map)
  currentMarkers.push(marker)
  return marker
}

function genElement (categoryId) {
  const el = document.createElement('div')
  const width = 50
  const height = 90
  el.className = 'marker'
  el.style.backgroundRepeat = 'no-repeat'
  // el.style.backgroundImage = `url(/assets/imgs/routers/${getIcon(categoryId)}.png)`;
  el.style.width = `${width}px`
  el.style.height = `${height}px`
  el.style.backgroundSize = '100%'
  el.style.borderRadius = `${width}px`
  return el
}

const genContent = (mapeoObs) => `<div class="px-4 py-12">
        <h1 class="text-lg capitalize text-xl">${mapeoObs}</h1>
        <div class="flex flex-row justify-between">
    </div>
</div>`

async function generateHtml (mapeoData, noFly, filter) {
  console.log('Redraw...')
  /** filter variables: observations */
  const cleanObs = mapeoData
    .filter((obs) => obs.lat && obs.lon)
    .filter((obs) => {
      if (filter) {
        return checkIsFiltered(obs, filter)
      } else return obs
    })
  /** get center of the map */
  if (cleanObs.length > 0) {
    const listOfCoords = cleanObs.map((i) => [i.lon, i.lat])
    const mapCenter = getLatLngCenter(listOfCoords)
    storage.setItem('map_center', JSON.stringify(mapCenter))
    if (!noFly) {
      map.flyTo({
        center: mapCenter
      })
    }
  }
  /** set random colors for markers */
  cleanObs.forEach((obs) => {
    if (categoryIndex.obs?.tags?.categoryId[obs.tags?.categoryId]) return
    categoryIndex[obs.tags?.categoryId] = getRandomColor()
  })
  clearMarkers()
  for await (const mapeoObs of cleanObs) {
    const el = genElement(mapeoObs.tags?.categoryId)
    const content = window.localStorage.getItem(`content-${mapeoObs.id}`)
    const parsedContent = JSON.parse(content)
    generateMarker(mapeoObs, el, parsedContent)
  }
  /** generate html for each obs */
  clearMarkers()
  for await (const mapeoObs of cleanObs) {
    // has to be synchronous else authentication gets confused
    try {
      let content = ''
      let tempMarker
      const isFiltered = checkIsFiltered(mapeoObs, filter)
      /** if observation is one of the filtered types */
      if (isFiltered && filter) {
        const el = genElement(mapeoObs.tags?.categoryId)
        content = genContent(mapeoObs)
        tempMarker = generateMarker(mapeoObs, el, content)
        window.localStorage.setItem(
          `content-${mapeoObs.id}`,
          JSON.stringify(content)
        )
        if (tempMarker) tempMarker.remove()
        generateMarker(mapeoObs, el, content)
        const marker = new mapboxgl.Marker({
          color: categoryIndex[mapeoObs.tags?.categoryId]
        })
          .setLngLat([mapeoObs.lon, mapeoObs.lat])
          .addTo(map)
        currentMarkers.push(marker)
      }
    } catch (err) {
      console.log(`Error generating HTML for ${mapeoObs.id}:`, err)
      return
    }
  }
}
