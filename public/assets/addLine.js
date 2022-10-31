function addLine(map, id, point1, point2, quality) {
    let color = quality === 3 ? 'green' : quality === '2' ? 'orange' : 'red'
    if (!quality) quality = 'grey'
    map.addSource(id, {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': [
                    point1,
                    point2
                ]
            }
        }
    });
    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': color,
            'line-width': 4,
            'line-offset': 4
        }
    });
}
