/** get observations and create markers */
let currentMarkers = [];
let currentLines = []
let categoryIndex = {}

function clearMarkers() {
    if (currentLines !== null) {
        currentLines.forEach(l => {
            window.mapboxMap.removeLayer(l)
            currentLines = []
        })
    }
    if (currentMarkers !== null) {
        for (var i = currentMarkers.length - 1; i >= 0; i--) {
            currentMarkers[i].remove();
        }
    }
}

function generateMarker(mapeoObs, markerEl, popupContent) {
    const popup = new mapboxgl.Popup({ offset: [0, -45] }).setHTML(popupContent)
    markerEl.addEventListener('click', () => {
        if (map.getZoom() < 18) {
            map.easeTo({
                center: [mapeoObs.lon, mapeoObs.lat],
                zoom: 18,
                speed: 0.2,
                curve: 1,
                duration: 2500,
                easing(t) {
                    return t;
                }
            });
        }
    });
    const marker = new mapboxgl.Marker(markerEl)
        .setPopup(popup) // add popup
        .setLngLat([mapeoObs.lon, mapeoObs.lat])
        .addTo(map);
    currentMarkers.push(marker)
    return marker
}

function getQualityColor(signal_avg) {
    const quality = signal_avg > -65 ? 3 : signal_avg > -82 ? 2 : 1
    let color
    if (quality) color = quality === 3 ? 'green' : quality === 2 ? 'orange' : 'red'
    else color = 'grey'
    return color
}

function genElement(categoryId) {
    let el = document.createElement('div');
    const width = 50
    const height = 90
    el.className = 'marker';
    el.style.backgroundRepeat = 'no-repeat'
    // el.style.backgroundImage = `url(/assets/imgs/routers/${getIcon(categoryId)}.png)`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.backgroundSize = '100%';
    el.style.borderRadius = `${width}px`
    return el
}

const genContent = (mapeoObs) => `<div class="px-4 py-12">
        <h1 class="text-lg capitalize text-xl">${mapeoObs}</h1>
        <div class="flex flex-row justify-between">
    </div>
</div>`

async function generateHtml(mapeoData, noFly, filter) {
    console.log('Redraw...')
    /** filter variables: observations, nodes */
    const cleanObs = mapeoData
        .filter(obs => (obs.lat && obs.lon))
        .filter(obs => {
            if (filter) {
                return checkIsFiltered(obs, filter)
            } else return obs
        })
    /** get center of the map */
    if (cleanObs.length > 0) {
        const listOfCoords = cleanObs.map(i => [
            i.lon, i.lat
        ])
        const mapCenter = getLatLngCenter(listOfCoords)
        storage.setItem('map_center', JSON.stringify(mapCenter))
        if (!noFly) {
            map.flyTo({
                center: mapCenter
            });
        }
    }
    /** set random colors for markers */
    cleanObs.forEach(obs => {
        if (categoryIndex.obs?.tags?.categoryId[obs.tags?.categoryId]) return
        categoryIndex[obs.tags?.categoryId] = getRandomColor()
    });
    clearMarkers()
    for await (const mapeoObs of cleanObs) {
        const el = genElement(mapeoObs.tags?.categoryId)
        const content = window.localStorage.getItem(`content-${mapeoObs.id}`)
        const parsedContent = JSON.parse(content)
        generateMarker(mapeoObs, el, parsedContent)
    }
    /** generate html for each obs */
    clearMarkers()
    for await (const mapeoObs of cleanObs) { // has to be synchronous else authentication gets confused
        try {
            let networkButtons = ''
            let content = ''
            let tempMarker
            let nodeInfo
            const isFiltered = checkIsFiltered(mapeoObs, filter)
            const hostname = mapeoObs.tags?.hostname
            /** if observation is one of the filtered types */
            if (isFiltered && filter) {
                const el = genElement(mapeoObs.tags?.categoryId)
                if (!hostname) {
                    /** if observation is NOT connected to node */
                    unsetNodes
                        .forEach(node => {
                            networkButtons += `<button onclick="updateObservation('${node}', '${mapeoObs.id}', '${mapeoObs.version}')" style="background: ${getRandomColor()};" class="my-2 py-2 px-4">${node}</button>`
                        })
                    content = `<div class="px-4 py-12">
                            <button id="delete-button-${mapeoObs.id}" onclick="deleteObservation('${mapeoObs.id}')" class="bg-red-400 text-white text-center px-4 py-2 my-4">Delete</button>
                        </div>`
                } else {
                    /** if observation IS connected to node */
                    content = genContent(mapeoObs, nodeInfo)
                    tempMarker = generateMarker(mapeoObs, el, content)
                    try {
                        const nodeSession = await getSession(hostname)
                        if (!nodeSession?.username) await api.login('lime-app', 'generic', hostname)
                        const boardInfo = await getBoardData(hostname)
                        const meshInterfaces = await getMeshIfaces(hostname)
                        let interfaceList = []
                        for await (const interface of meshInterfaces) {
                            let assocs = await getAssocList(interface, hostname)
                            for await (const [index, assoc] of assocs.entries()) {
                                const getAssocHostname = await getBatHost(assoc.mac, interface, hostname)
                                const assocHostname = getAssocHostname.hostname
                                const lineDestObs = cleanObs.filter(o => o.tags?.hostname === assocHostname)
                                const lineDest = lineDestObs[0]
                                const qualityColor = getQualityColor(assoc.signal_avg)
                                if (lineDest) {
                                    const lineOrigin = [mapeoObs.lon, mapeoObs.lat]
                                    const id = `route-${crypto.randomUUID()}`
                                    addLine(map, id, lineOrigin, [lineDest.lon, lineDest.lat], qualityColor)
                                    currentLines.push(id)
                                }
                                assocs[index].hostname = assocHostname
                            }
                            interfaceList.push({
                                interface,
                                assocs
                            })

                        }
                        nodeInfo = `<h3 class="text-md py-4">${boardInfo.model}</h3>
                        <div class="flex">
                            <span class="px-1">${boardInfo.release.distribution}</span>
                            <span class="px-1">${boardInfo.release.version}</span>
                        </div>
                        <div class="flex flex-col mt-4 min-w-80">
                        ${interfaceList.map(interface => `<div class="border-green-900 border-2 p-2 rounded">${interface.assocs?.length > 0 ?
                            `<div class="flex justify-start">
                                <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M3.219 9.318c1.155-1.4 2.698-2.161 4.281-2.161v-1c-1.917 0-3.732.924-5.052 2.525l.771.636zM7.5 7.157c1.583 0 3.126.762 4.281 2.161l.771-.636C11.232 7.08 9.417 6.157 7.5 6.157v1zM.886 6.318C2.659 4.168 5.042 2.985 7.5 2.985v-1c-2.793 0-5.446 1.346-7.386 3.697l.772.636zM7.5 2.985c2.458 0 4.84 1.183 6.614 3.333l.772-.636C12.946 3.33 10.293 1.985 7.5 1.985v1zM7.5 12a.5.5 0 01-.5-.5H6A1.5 1.5 0 007.5 13v-1zm.5-.5a.5.5 0 01-.5.5v1A1.5 1.5 0 009 11.5H8zm-.5-.5a.5.5 0 01.5.5h1A1.5 1.5 0 007.5 10v1zm0-1A1.5 1.5 0 006 11.5h1a.5.5 0 01.5-.5v-1z" fill="currentColor"></path></svg>
                                <div class="flex flex-wrap justify-between">
                                    ${interface.assocs
                                .sort((a, b) => a - b)
                                .map(assoc => `<span class="px-2 text-${getQualityColor(assoc.signal_avg)}-600">${assoc.signal_avg}</span>`)}
                                </div>
                            </div>`
                            : `<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M6.5 11.5a1 1 0 102 0 1 1 0 00-2 0z" stroke="currentColor"></path></svg>`
                            }</div>`
                        )}
                        </div>`
                    } catch (err) {
                        console.log('Error communicating with node', hostname)
                    }


                }
                if (hostname) {
                    content = genContent(mapeoObs, nodeInfo)
                }
                window.localStorage.setItem(`content-${mapeoObs.id}`, JSON.stringify(content))
                if (tempMarker) tempMarker.remove()
                generateMarker(mapeoObs, el, content)
            } else {
                const marker = new mapboxgl.Marker({
                    color: categoryIndex[mapeoObs.tags?.categoryId],
                })
                    .setLngLat([mapeoObs.lon, mapeoObs.lat])
                    .addTo(map);
                currentMarkers.push(marker)

            }
        } catch (err) {
            console.log(`Error generating HTML for ${mapeoObs.id}:`, err)
            return
        }
    }
}