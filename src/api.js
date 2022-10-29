const path = require('path')
const fastify = require('fastify')({ logger: true })

module.exports = (mapeo, filteredType) => {
    fastify.get('/', (req, reply) => {
        reply.sendFile('index.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
    })
    fastify.get('/mapeo', (req, reply) => {
        // const asyncObs = promisify(mapeo.observationList(null))
        // console.log(asyncObs)
        // const data = await asyncObs()
        mapeo.observationList(null, (err, data) => {
            if (err) return console.error(err)
            console.log('GOT DATA')
            // return data
            reply.send(data)
        })
        // console.log('DATA', data)

    })
    fastify.get('/test', async (request, reply) => {
        return { hello: 'world' }
    })

    // Run the server!
    const start = async () => {
        await fastify.register(require('@fastify/cors'))
        await fastify.register(require('@fastify/static'), {
            root: path.join(__dirname, '..', 'public'),
            prefix: '/', // optional: default '/'
        })
        try {
            await fastify.listen({ port: 3000 })
        } catch (err) {
            fastify.log.error(err)
            process.exit(1)
        }
    }
    start()
}