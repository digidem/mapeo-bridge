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
        lat: i.lat,
        long: i.lon,
        region: i.tags?.region || 'unknown',
        description: i.description || i.tags?.type,
        photo: i.attachments[0]?.id
      }))
    terrastoriesPlaceData.forEach((i) => {
      const size = 'preview'
      if (i.photo) {
        const src = `${instanceDir}/media/${size}/${i.photo.slice(0, 2)}/${
          i.photo
        }`
        const dest = `${csvPath}/${i.photo}`
        fs.copyFile(src, dest, (err) => {
          if (err) throw err
          console.log(`Copied ${src} to ${dest}`)
        })
      }
    })

    const writer = fs.createWriteStream(
      path.join(csvPath, `${filteredType}.csv`)
    )
    jsonexport(terrastoriesPlaceData, { rowDelimiter: ',' }, (err, csv) => {
      if (err) return console.error(err)
      writer.write(csv)
    })
  })
}
