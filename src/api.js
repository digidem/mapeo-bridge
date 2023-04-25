const path = require('path')
const fastify = require('fastify')({ logger: true })

module.exports = (mapeo, filteredType) => {
  fastify.get('/', (req, reply) => {
    reply.sendFile('index.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
  })
  fastify.get('/tiles', (req, reply) => {
    return {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: [
            process.env.OFFLINE_MAP_STYLE ||
              `${
                req.hostname.split(':')[0]
              }:8085/styles/terrastories-map/{z}/{x}/{y}.png`
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  })
  fastify.get('/style', (_, reply) => {
    reply.send(process.env.OFFLINE_MAP_STYLE || null)
  })
  fastify.get('/mapeo', (req, reply) => {
    mapeo.observationList(null, (err, data) => {
      if (err) return console.error(err)
      reply.send(data)
    })
  })
  fastify.post('/mapeo', (req, reply) => {
    const { lat, lng } = req.body
    const obs = {
      attachments: [],
      type: 'observation',
      lat,
      lon: lng,
      tags: {
        categoryId: 'router',
        type: 'network'
      }
    }
    mapeo.observationCreate(obs, (err, data) => {
      if (err) console.error(err)
      reply.send(data)
    })
  })
  fastify.put('/mapeo', (req, reply) => {
    const { observationId, observationVersion, nodeHostname, nodeModel } =
      req.body
    const obs = {
      version: observationVersion,
      id: observationId,
      type: 'observation',
      tags: {
        categoryId: nodeModel,
        hostname: nodeHostname,
        type: 'network'
      }
    }
    mapeo.observationUpdate(obs, (err, data) => {
      console.log('data', data)
      if (err) {
        console.error(err)
        reply.err(err)
      }
      reply.send(data)
    })
  })
  fastify.delete('/mapeo', (req, reply) => {
    console.log('req.body', req.body)
    const { observationId } = req.body
    mapeo.observationDelete(observationId, (err, data) => {
      console.log('data', data)
      if (err) {
        console.error(err)
        reply.err(err)
      }
      reply.send(data)
    })
  })

  // Run the server!
  const start = async () => {
    await fastify.register(require('@fastify/cors'))
    await fastify.register(require('@fastify/static'), {
      root: path.join(__dirname, '..', 'public'),
      prefix: '/' // optional: default '/'
    })
    try {
      await fastify.listen({ host: '0.0.0.0', port: process.env.PORT || 8084 })
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
  start()
}
