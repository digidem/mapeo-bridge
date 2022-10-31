/** Generate random color */
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/** Get center of coords */

function rad2degr(rad) { return rad * 180 / Math.PI; }
function degr2rad(degr) { return degr * Math.PI / 180; }

/**
 * @param latLngInDeg array of arrays with latitude and longtitude
 *   pairs in degrees. e.g. [[latitude1, longtitude1], [latitude2
 *   [longtitude2] ...]
 *
 * @return array with the center latitude longtitude pairs in 
 *   degrees.
 */
function getLatLngCenter(latLngInDegr) {
    var LATIDX = 0;
    var LNGIDX = 1;
    var sumX = 0;
    var sumY = 0;
    var sumZ = 0;

    for (var i = 0; i < latLngInDegr.length; i++) {
        var lat = degr2rad(latLngInDegr[i][LATIDX]);
        var lng = degr2rad(latLngInDegr[i][LNGIDX]);
        // sum of cartesian coordinates
        sumX += Math.cos(lat) * Math.cos(lng);
        sumY += Math.cos(lat) * Math.sin(lng);
        sumZ += Math.sin(lat);
    }

    var avgX = sumX / latLngInDegr.length;
    var avgY = sumY / latLngInDegr.length;
    var avgZ = sumZ / latLngInDegr.length;

    // convert average x, y, z coordinate to latitude and longtitude
    var lng = Math.atan2(avgY, avgX);
    var hyp = Math.sqrt(avgX * avgX + avgY * avgY);
    var lat = Math.atan2(avgZ, hyp);

    return ([rad2degr(lat), rad2degr(lng)]);
}

/** Slugify */
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

/** un-link observation from hostname */
function unlinkObservation(observationId, observationVersion) {
    axios.put('http://localhost:3000/mapeo', {
        observationId,
        observationVersion,
        nodeHostname: null,
        nodeModel: 'roteador' //
    })
        .then(update => {
            observationsToMarkers({ noFly: true, filter: window.filteredTypes })
        })
        .catch(err => console.log(err))
}

/** update observation with libremesh node information */
function updateObservation(node, observationId, observationVersion) {
    api.login('lime-app', 'generic', node)
        .then(() => {
            getBoardData(node)
                .then(data => {
                    axios.put('http://localhost:3000/mapeo', {
                        observationId,
                        observationVersion,
                        nodeHostname: node,
                        nodeModel: slugify(data.model)
                    })
                        .then(update => {
                            observationsToMarkers({ noFly: true, filter: window.filteredTypes })
                        })
                        .catch(err => console.log(err))
                })
                .catch(err => console.log(err))
        })
        .catch(err => console.log('Auth error', err))
}

/** check is in filter */
function checkIsFiltered(obs, filter) {
    if (filter && Array.isArray(filter)) {
        const filtered = filter.filter(e => obs.tags?.categoryId === e)
        if (filtered.length > 0) return obs
    }
}
/** get observations and create markers */
let currentMarkers = [];
let currentLines = []
let categoryIndex = {}

async function observationsToMarkers({ noFly, filter }) {
    const map = window.mapboxMap
    const session = await getSession()
    if (!session?.username) await api.login('lime-app', 'generic')
    clearMarkers()
    try {
        const getMapeoData = await axios.get('http://localhost:3000/mapeo')
        const mapeoData = getMapeoData.data
        const cloudNodesData = await getCloudNodes()
        const cloudNodes = cloudNodesData.nodes
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
            /** set random colors for markers */
            cleanObs.forEach(obs => {
                if (categoryIndex.obs?.tags?.categoryId[obs.tags?.categoryId]) return
                categoryIndex[obs.tags?.categoryId] = getRandomColor()
            });
        }
        /** figure nodes that aren't set */
        const unsetNodes = cloudNodes.filter(node => {
            const isUsed = cleanObs.filter(obs => node === obs.tags?.hostname)
            if (!isUsed || isUsed.length < 1) return node
        })
        /** generate html for each obs */
        for await (const mapeoObs of cleanObs) {
            const isFiltered = checkIsFiltered(mapeoObs, filter)
            const hostname = mapeoObs.tags?.hostname
            /** if observation is one of the filtered types */
            if (isFiltered) {
                el = document.createElement('div');
                const width = 50
                const height = 90
                el.className = 'marker';
                el.style.backgroundRepeat = 'no-repeat'
                el.style.backgroundImage = `url(/assets/${mapeoObs.tags?.categoryId}.png)`;
                el.style.width = `${width}px`;
                el.style.height = `${height}px`;
                el.style.backgroundSize = '100%';
                el.style.borderRadius = `${width}px`
                let networkButtons = ''
                let content = ''
                if (!hostname) {
                    /** if observation is NOT connected to node */
                    unsetNodes
                        .forEach(node => {
                            networkButtons += `<button onclick="updateObservation('${node}', '${mapeoObs.id}', '${mapeoObs.version}')" style="background: ${getRandomColor()};" class="my-2 py-2 px-4">${node}</button>`
                        })
                    content = `<div class="px-4 py-12">
                                    ${networkButtons.length > 0 ? `<h3 class="text-center pb-8">Connect to a LibreMesh node</h3>` : 'No nodes available to connect'}
                                    <div class="flex flex-col align-middle items-center max-h-80 overflow-y-scroll">
                                        ${networkButtons}
                                    </div>
                                </div>`
                } else {
                    /** if observation IS connected to node */
                    const nodeSession = await getSession(hostname)
                    if (!nodeSession?.username) await api.login('lime-app', 'generic', hostname)
                    const boardInfo = await getBoardData(hostname)
                    console.log(boardInfo)
                    const meshInterfaces = await getMeshIfaces(hostname)
                    let interfaceList = []
                    for await (const interface of meshInterfaces) {
                        let assocs = await getAssocList(interface, hostname)
                        for await (const [index, assoc] of assocs.entries()) {
                            const getAssocHostname = await getBatHost(assoc.mac, interface, hostname)
                            const assocHostname = getAssocHostname.hostname
                            const lineDestObs = cleanObs.filter(o => o.tags?.hostname === assocHostname)
                            const lineDest = lineDestObs[0]
                            const quality = assoc.signal_avg > -72 ? 3 : assoc.signal_avg > -76 ? 2 : 1
                            if (lineDest) {
                                const lineOrigin = [mapeoObs.lon, mapeoObs.lat]
                                const id = `route-${crypto.randomUUID()}`
                                addLine(map, id, lineOrigin, [lineDest.lon, lineDest.lat], quality)
                                currentLines.push(id)
                            }
                            assocs[index].hostname = assocHostname
                        }
                        interfaceList.push({
                            interface,
                            assocs
                        })

                    }
                    content = `<div class="px-4 py-12">
                                    <h1 class="text-lg capitalize text-xl">${mapeoObs.tags?.hostname}</h1>
                                    <h3 class="text-md py-4">${boardInfo.model}</h3>
                                    <div class="flex">
                                        <span class="px-1">${boardInfo.release.distribution}</span>
                                        <span class="px-1">${boardInfo.release.version}</span>
                                    </div>
                                    <div class="flex mt-4 min-w-80">
                                    ${interfaceList.map(interface => `<div class="border-green-900 border-2 p-2 rounded">${interface.assocs?.length > 0 ?
                                        `<div class="flex justify-between">
                                            <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M3.219 9.318c1.155-1.4 2.698-2.161 4.281-2.161v-1c-1.917 0-3.732.924-5.052 2.525l.771.636zM7.5 7.157c1.583 0 3.126.762 4.281 2.161l.771-.636C11.232 7.08 9.417 6.157 7.5 6.157v1zM.886 6.318C2.659 4.168 5.042 2.985 7.5 2.985v-1c-2.793 0-5.446 1.346-7.386 3.697l.772.636zM7.5 2.985c2.458 0 4.84 1.183 6.614 3.333l.772-.636C12.946 3.33 10.293 1.985 7.5 1.985v1zM7.5 12a.5.5 0 01-.5-.5H6A1.5 1.5 0 007.5 13v-1zm.5-.5a.5.5 0 01-.5.5v1A1.5 1.5 0 009 11.5H8zm-.5-.5a.5.5 0 01.5.5h1A1.5 1.5 0 007.5 10v1zm0-1A1.5 1.5 0 006 11.5h1a.5.5 0 01.5-.5v-1z" fill="currentColor"></path></svg>
                                            <div class="flex justify-between">
                                                ${interface.assocs.map(assoc => `<span class="px-2">${assoc.signal_avg}</span>`)}
                                            </div>
                                        </div>`
                                        : `<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M6.5 11.5a1 1 0 102 0 1 1 0 00-2 0z" stroke="currentColor"></path></svg>`
                                        }</div>`
                                    )}
                                    </div>
                                    <div class="flex flex-row justify-between">
                                    <a class="bg-indigo-500 text-white text-center px-4 py-2 my-4" target="_blank" href="http://${mapeoObs.tags?.hostname}/">
                                        Visit node
                                    </a>
                                    <button
                                        onclick="unlinkObservation('${mapeoObs.id}', '${mapeoObs.version}')"
                                        class="bg-red-500 text-white text-center px-4 py-2 my-4" target="_blank" href="http://${mapeoObs.tags?.hostname}/">
                                    Unlink node
                                </button>
                                </div>
                                </div>`
                }
                const popup = new mapboxgl.Popup({ offset: [0, -45] }).setHTML(content)
                el.addEventListener('click', () => {
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
                const marker = new mapboxgl.Marker(el)
                    .setPopup(popup) // add popup
                    .setLngLat([mapeoObs.lon, mapeoObs.lat])
                    .addTo(map);
                currentMarkers.push(marker)
            } else {
                const marker = new mapboxgl.Marker({
                    color: categoryIndex[mapeoObs.tags?.categoryId],
                })
                    .setLngLat([mapeoObs.lon, mapeoObs.lat])
                    .addTo(map);
                currentMarkers.push(marker)

            }
        }
    } catch (err) {
        console.log('Error', err)
    }
}

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
