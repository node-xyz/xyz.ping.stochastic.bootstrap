let interval = 2 * 1000
let minInterval = 2.5 * 1000
let maxInterval = 25 * 1000
let mean = maxInterval - minInterval
let threshold = 2000
let kick = 5
const GenericMiddlewareHandler = require('xyz-core/src/Middleware/generic.middleware.handler')
const _httpExport = require('xyz-core/src/Transport/Middlewares/call/http.export.middleware')

function increaseTrust () {
  let speed = 1 - (Math.abs(interval, mean) / maxInterval)
  interval = interval + (threshold * speed)
  if (interval > maxInterval) interval = maxInterval
}

function decreseTrust () {
  interval = interval / 2
  if (interval < minInterval) interval = minInterval
}

let stochasticPingBoostraper = (xyz, event, port) => {
  let logger = xyz.logger
  let CONFIG = xyz.CONFIG
  const CONSTANTS = xyz.CONSTANTS
  let wrapper = xyz.Util.wrapper

  let SR = xyz.serviceRepository
  SR.outOfReachNodes = {}
  let transport = SR.transport
  const _id = `${xyz.id().host}:${xyz.id().port}`

  let joinCandidate = []

  let seeds = CONFIG.getSelfConf().seed
  function contactSeed (idx) {
    transport.send({node: seeds[idx], payload: {id: _id}, route: 'PING'}, (err, body, res) => {
      if (!err) {
        logger.info(`${wrapper('bold', 'JOIN PING ACCEPTED')}. response : ${JSON.stringify(body)}`)
        for (let node of body.nodes) {
          SR.joinNode(node)
        }
        // no need to do this. guess why :D
        // this.joinNode(seeds[idx])
      } else {
        logger.error(`${wrapper('bold', 'JOIN PING REJECTED')} :: seed node ${seeds[idx]} rejected with `)
        setTimeout(() => contactSeed(idx === seeds.length - 1 ? 0 : ++idx), interval + Util.Random(threshold))
      }
    })
  }

  function _ping () {
    let nodes = CONFIG.getSystemConf().nodes
    const last = nodes[nodes.length - 1]
    logger.verbose(`ping cycle started. current interval: ${interval / 1000}s`)
    for (let node of nodes) {
      SR.transport.send({
        route: 'PING',
        node: node,
        payload: {id: _id}}, function (_node, err, body, res) {
          if (err == null) {
            SR.foreignNodes[_node] = body.services

            for (let tempNode of body.nodes) {
              if (nodes.indexOf(tempNode) === -1) {
                joinCandidate.push(tempNode)
                logger.warn(`new join candidate suggested by ${_node} : {${tempNode}}`)
              }
            }

          // but we trust the callee 100% so we set it's availability to full
            SR.outOfReachNodes[_node] = 0
            logger.debug(`${wrapper('bold', 'PING')} success :: response = ${JSON.stringify(body)}`)
            increaseTrust()
          } else {
            if (SR.outOfReachNodes[_node]) {
              if (SR.outOfReachNodes[_node] === (kick) && SR.foreignNodes[_node]) {
                logger.error(`removing node {${node}} from foreignNodes and nodes list`)
                SR.kickNode(_node)
                interval = minInterval
              } else {
                SR.outOfReachNodes[_node] += 1
              }
            } else {
              SR.outOfReachNodes[_node] = 1
            }
            decreseTrust()
            logger.error(`Ping Error :: ${_node} has been out of reach for ${SR.outOfReachNodes[_node]} pings ::  ${JSON.stringify(err)}`)
          }

          if (_node === last) {
            for (let cNode of joinCandidate) {
              SR.transport.send({node: cNode, route: 'PING', payload: {id: _id}}, function (__node, err, body, res) {
              // this candidate has failed to prove itself
                if (err) {
                  logger.error(`join candidate ${__node} rejected due to ${err}`)
                } else {
                // note that we do not use the body (services) here.
                // we wait until the next ping round for double check
                  SR.joinNode(__node)
                }
                joinCandidate.splice(joinCandidate.indexOf(__node))
              }.bind(null, cNode))
            }
            setTimeout(_ping, interval)
          }
        }.bind(null, node))
    }
  }

  function onPingReceive (body, response) {
    if (CONFIG.getSystemConf().nodes.indexOf(body.id) === -1) {
      logger.warn(`new node is pinging me. adding to joinCandidate list. address : ${body.id}`)
      joinCandidate.push(body.id)
    }
    logger.debug(`Responding a PING message from ${body.id}`)
    response.end(JSON.stringify({
      services: SR.services.serializedTree,
      nodes: CONFIG.getSystemConf().nodes,
      transportServers: SR.transport.getServerRoutes()}))
  }

  function _pingEvent (params, next, end, xyz) {
    // let request = params[0]
    let response = params[1]
    let body = params[2]
    let _transport = xyz.serviceRepository.transport.servers[port]

    logger.silly(`PING :: Passing ping to up to service repo`)
    _transport.emit(CONSTANTS.events.PING, body, response)
    next()
  }

  let pingReceiveMiddlewareStack = new GenericMiddlewareHandler(xyz, 'pingReceiveMiddlewareStack', 'PING')
  let pingDispatchMiddlewareStack = new GenericMiddlewareHandler(xyz, 'pingDispatchMiddlewareStack', 'PING')
  pingReceiveMiddlewareStack.register(0, _pingEvent)
  pingDispatchMiddlewareStack.register(0, _httpExport)

  SR.transport.registerRoute('PING', pingDispatchMiddlewareStack)
  SR.transport.servers[port].registerRoute('PING', pingReceiveMiddlewareStack)

  SR.transport.servers[port].on(CONSTANTS.events.PING, onPingReceive)

  logger.info(`stochastic ping bootstraped for approx. every ${interval} ms`)

  if (event) {
    logger.info('ipc channel created from stochastic ping')
    process.on('message', (data) => {
      if (data.title === 'pingRate') {
        process.send({
          title: data.title,
          body: {interval: interval, maxInterval: maxInterval, minInterval: minInterval}
        })
      }
    })
  }

  _ping()

  if (seeds.length) {
    contactSeed(0)
  }
}

module.exports = stochasticPingBoostraper
