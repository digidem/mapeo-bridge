const Mapeo = require('./src/mapeo')
const instance = new Mapeo({})
const key =
  process.env.MAPEO_PROJECT_KEY ||
  '402644527f9e77fb4bf730c260d946104ecbde67948f73467e0c415f4437f884' // TODO: change this to mapeo default

instance.get(key)
