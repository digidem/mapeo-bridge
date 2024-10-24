const path = require('path')
const fastify = require('fastify')({ logger: true })

module.exports = (mapeo, filteredType) => {
  fastify.get('/', (req, reply) => {
    reply.sendFile('index.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
  })
  fastify.get('/mapeo', (req, reply) => {
    const { category, name } = req.query
    mapeo.observationList(null, (err, data) => {
      if (err) {
        console.error(err)
        return reply.status(500).send({ error: 'Internal Server Error' })
      }
      let filteredData = data
      if (category) {
        const categories = Array.isArray(category) ? category : [category]
        filteredData = filteredData.filter(obs => {
          return obs.tags && obs.tags.categoryId && categories.includes(obs.tags.categoryId)
        })
      }
      if (name) {
        const lowercaseName = name.toLowerCase()
        filteredData = filteredData.filter(obs => {
          return obs.tags && obs.tags.name && obs.tags.name.toLowerCase().includes(lowercaseName)
        })
      }
      reply.send(filteredData)
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
  fastify.put('/mapeo', async (req, reply) => {
    try {
      const { observationId, observationVersion, nodeHostname, nodeModel } = req.body
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
      console.log('Updating observation:', obs)
      const data = await new Promise((resolve, reject) => {
        mapeo.observationUpdate(obs, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
      console.log('Update successful:', data)
      reply.send(data)
    } catch (error) {
      console.error('Error updating observation:', error)
      reply.status(500).send({ error: 'Internal Server Error' })
    }
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
      await fastify.listen({ host: '0.0.0.0', port: 3000 })
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
  start()
}
