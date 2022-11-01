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
        nodeModel: 'router' //
    })
        .then(update => {
            observationsToMarkers({ noFly: true, filter: true })
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
                            observationsToMarkers({ noFly: true, filter: true })
                        })
                        .catch(err => console.log(err))
                })
                .catch(err => console.log(err))
        })
        .catch(err => console.log('Auth error', err))
}

/** delete observation */
async function deleteObservation(observationId) {
    let deleteButton = document.getElementById(`delete-button-${observationId}`)
    deleteButton.classList.add = 'hidden'
    const update = await axios.delete('http://localhost:3000/mapeo', { data: { observationId } })
    await observationsToMarkers({ noFly: true, filter: true })
    deleteButton.classList.remove = 'hidden'
}

/** check is in filter */
function checkIsFiltered(obs, filter) {
    if (filter) return obs.tags?.type === 'network'
    else return obs
}
async function observationsToMarkers({ noFly, filter }) {
    const map = window.mapboxMap
    const session = await getSession()
    if (!session?.username) await api.login('lime-app', 'generic')
    try {
        // Get local storage
        const localObs = window.localStorage.getItem('mapeo-obs')
        const localNodes = window.localStorage.getItem('lime-nodes')
        const parsedObs = JSON.parse(localObs)
        const parsedNodes = JSON.parse(localNodes)
        if (parsedObs && parsedNodes) await generateHtml(parsedObs, parsedNodes)
        const getMapeoData = await axios.get('http://localhost:3000/mapeo')
        const mapeoData = getMapeoData.data
        const cloudNodesData = await getCloudNodes()
        const cloudNodes = cloudNodesData.nodes
        // Set local storage
        window.localStorage.setItem('mapeo-obs', JSON.stringify(mapeoData))
        window.localStorage.setItem('lime-nodes', JSON.stringify(cloudNodes))
        /** generate the html */
        await generateHtml(mapeoData, cloudNodes, noFly, filter)
    } catch (err) {
        console.log('Error', err)
    }
}


