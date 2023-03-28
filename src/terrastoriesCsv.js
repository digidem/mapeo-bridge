const jsonexport = require('jsonexport')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

module.exports = (mapeo, DEFAULT_STORAGE, instanceDir, filteredType) => {
  const csvPath = process.env.CSV_PATH || path.join(DEFAULT_STORAGE, 'export')
  console.log(
    'Generating Terrastories CSV with type',
    filteredType,
    'at',
    csvPath
  )
  mkdirp.sync(csvPath)
  return mapeo.observationList(null, (err, data) => {
    if (err) return console.error(err)
    const terrastoriesPlaceData = data
      .filter((i) => i.tags?.categoryId === filteredType)
      .map((i) => ({
        name: i.tags?.name || i.tags?.categoryId,
        type_of_place: i.tags?.type || i.tags?.categoryId,
        description: i.description || i.tags?.type,
        region: i.tags?.region || 'unknown',
        long: i.lon,
        lat: i.lat,
        media: i.attachments[0]?.id
      }))
    terrastoriesPlaceData.forEach((i) => {
      const size = 'preview'
      if (i.media) {
        const src = `${instanceDir}/media/${size}/${i.media.slice(0, 2)}/${
          i.media
        }`
        const dest = `${csvPath}/${i.media}`
        fs.copyFile(src, dest, (err) => {
          if (err) throw err
          console.log(`Copied ${src} to ${dest}`)
        })
      }
    })

    // console.log("terrastoriesPlaceData", terrastoriesPlaceData);
    const writer = fs.createWriteStream(
      path.join(csvPath, `${filteredType}.csv`)
    )
    // TODO: create media folder and copy over media from place
    jsonexport(terrastoriesPlaceData, { rowDelimiter: ',' }, (err, csv) => {
      if (err) return console.error(err)
      writer.write(csv)
    })
  })
}
