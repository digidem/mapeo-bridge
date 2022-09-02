const jsonexport = require('jsonexport')
const fs = require('fs')

const Mapeo = require('./mapeo')
const instance = new Mapeo({})
const filteredType = 'terrastories'
const key =
  process.env.MAPEO_PROJECT_KEY ||
  'af43cbdb6827d3ddc5b39b20df174bf5c3e44d9bbcdccfe034af090440cebf69'
const mapeo = instance.get(key)
mapeo.observationList(null, (err, data) => {
  if (err) return console.error(err)
  const terrastoriesPlaceData = data
    .filter((i) => i.tags?.type === filteredType)
    .map((i) => {
      return {
        name: i.tags?.type,
        type_of_place: i.tags?.type,
        description: i.tags?.type,
        region: i.tags?.type,
        long: i.lon,
        lat: i.lat,
        media: i.attachments[0].id
      }
    })
  const writer = fs.createWriteStream('out.csv')
  jsonexport(terrastoriesPlaceData, { rowDelimiter: ',' }, (err, csv) => {
    if (err) return console.error(err)
    writer.write(csv)
  })
})
