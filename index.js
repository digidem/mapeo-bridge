const Mapeo = require('./src/mapeo')
const instance = new Mapeo({})
const key =
  process.env.MAPEO_PROJECT_KEY ||
  'af43cbdb6827d3ddc5b39b20df174bf5c3e44d9bbcdccfe034af090440cebf69' // TODO: change this to mapeo default

instance.get(key)
