const jsonexport = require('jsonexport')
const fs = require('fs')
const path = require('path')

module.exports = (mapeo, DEFAULT_STORAGE, filteredType) => {
  return mapeo.observationList(null, (err, data) => {
    if (err) return console.error(err)
    const terrastoriesPlaceData = data
      .filter((i) => i.tags?.type === filteredType)
      .map((i) => ({
        name: i.name,
        type_of_place: i.tags?.type,
        description: i.description || i.tags?.type,
        region: i.tags?.region || 'unknown',
        long: i.lon,
        lat: i.lat,
        media: i.attachments[0].id
      }))
    const writer = fs.createWriteStream(path.join(DEFAULT_STORAGE, `${filteredType}.csv`))
    // TODO: create media folder and copy over media from place
    jsonexport(terrastoriesPlaceData, { rowDelimiter: ',' }, (err, csv) => {
      if (err) return console.error(err)
      writer.write(csv)
    })
  })
}
