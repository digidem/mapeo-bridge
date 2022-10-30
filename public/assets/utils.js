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



/** update observation with libremesh node information */
function updateObservation(node, observationId, observationVersion, map) {
    getBoardData()
        .then(data => {
            console.log('DATA', data)
            axios.put('http://localhost:3000/mapeo', {
                observationId,
                observationVersion,
                nodeHostname: node,
                nodeModel: slugify(data.model)
            })
                .then(update => {
                    console.log('update', update)
                    // Update markers without reloading
                    // observationsToMarkers({map, noFly: true})
                    location.reload()
                })
                .catch(err => console.log(err))
        })
        .catch(err => console.log(err))
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

function observationsToMarkers({ map, noFly, filter }) {
    getCloudNodes()
        .then(data => {
            const cloudNodes = data.nodes
            axios.get('http://localhost:3000/mapeo') // Must be dynamic to pull from other nodes
                .then((mapeo) => {
                    const cleanObs = mapeo.data
                        .filter(obs => (obs.lat && obs.lon))
                        .filter(obs => {
                            if (filter) {
                                return checkIsFiltered(obs, filter)
                            } else return obs
                        })
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

                    let categoryIndex = {}
                    cleanObs.forEach(obs => {
                        if (categoryIndex.obs?.tags?.categoryId[obs.tags?.categoryId]) return
                        categoryIndex[obs.tags?.categoryId] = getRandomColor()
                    });
                    cleanObs.map(mapeoObs => {
                        const isFiltered = checkIsFiltered(mapeoObs, filter)
                        const isSet = mapeoObs.tags?.hostname
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
                            if (!isSet) {
                                cloudNodes
                                    .forEach(node => {
                                        networkButtons += `<button onclick="updateObservation('${node}', '${mapeoObs.id}', '${mapeoObs.version}', '${map}')" style="background: ${getRandomColor()};" class="my-2 py-2 px-4">${node}</button>`
                                    })
                                content = `<div class="px-4 py-12">
                    <h1>${mapeoObs.tags?.categoryId}</h1>
                    <h3 class="text-center pb-8">Connect to a LibreMesh node</h3>
                    <div class="flex flex-col align-middle items-center max-h-80 overflow-y-scroll">
                        ${networkButtons}
                    </div>
                </div>`
                            } else {
                                content = `<div class="px-4 py-12">
                                <h1 class="text-lg">${mapeoObs.tags?.hostname}</h1>
                                <h3 class="text-md py-4">${mapeoObs.tags?.categoryId}</h3>
                                <a class="bg-indigo-500 px-4 py-2 my-4" target="_blank" href="http://${mapeoObs.tags?.hostname}/">
                                    Visit node
                                </a>
                            </div>`
                            }

                            const popup = new mapboxgl.Popup({ offset: [0, -65] }).setHTML(content)

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
                    })
                })
        })
        .catch(e => console.log('CAUGHT ERROR:', e))
    clearMarkers()
}

// Clear markers
// remove markers 
function clearMarkers() {
    if (currentMarkers !== null) {
        for (var i = currentMarkers.length - 1; i >= 0; i--) {
            currentMarkers[i].remove();
        }
    }
}
