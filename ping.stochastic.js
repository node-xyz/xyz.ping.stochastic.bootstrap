let interval
let minInterval
let maxInterval
let mean
let threshold = 2000
let kick
let logger
const GenericMiddlewareHandler = require('xyz-core/src/Middleware/generic.middleware.handler')
const _httpExport = require('xyz-core/src/Transport/Middlewares/call/http.export.middleware')

function increaseTrust () {
  logger.debug(`STOCH PING :: increasing interval`)
  let speed = 1 - (Math.abs(interval, mean) / maxInterval)
  interval = interval + (threshold * speed)
  if (interval > maxInterval) interval = maxInterval
}

function decreseTrust () {
  logger.debug(`STOCH PING :: decreasing interval`)
  interval = interval / 2
  if (interval < minInterval) interval = minInterval
}

let stochasticPingBoostraper = (xyz, opt = {}) => {
  let port = opt.port || xyz.id().port
  let event = opt.event || true
  let routePrefix = opt.routePrefix || 'PING'
  minInterval = opt.minInterval || 2.5 * 1000
  maxInterval = opt.maxInterval || 25 * 1000
  interval = opt.interval || 5 * 1000
  mean = maxInterval - minInterval
  kick = opt.kick || 5

  logger = xyz.logger
  let CONFIG = xyz.CONFIG
  const CONSTANTS = xyz.CONSTANTS
  let wrapper = xyz.Util.wrapper
  let Util = xyz.Util

  let SR = xyz.serviceRepository
  SR.outOfReachNodes = {}
  let transport = SR.transport

  let joinCandidate = []

  let seeds = CONFIG.getSelfConf().seed
  function contactSeed (idx) {
    transport.send({node: seeds[idx], route: routePrefix}, (err, body, res) => {
      if (!err) {
        logger.info(`STOCH PING :: ${wrapper('bold', 'JOIN PING ACCEPTED')}. response : ${JSON.stringify(body)}`)
        for (let node of body.nodes) {
          SR.joinNode(node)
        }
        // no need to do this. guess why :D
        // this.joinNode(seeds[idx])
      } else {
        logger.error(`STOCH PING :: ${wrapper('bold', 'JOIN PING REJECTED')} :: seed node ${seeds[idx]} rejected with `)
        setTimeout(() => contactSeed(idx === seeds.length - 1 ? 0 : ++idx), interval + Util.Random(threshold))
      }
    })
  }

  function _ping () {
    let nodes = CONFIG.getSystemConf().nodes
    const last = nodes[nodes.length - 1]
    let failed = false
    logger.verbose(`STOCH PING :: ping cycle started. current interval: ${interval / 1000}s`)
    for (let node of nodes) {
      SR.transport.send({
        route: routePrefix,
        node: node }, function (_node, err, body, res) {
          if (err == null) {
            SR.foreignNodes[_node] = body.services

            for (let tempNode of body.nodes) {
              if (nodes.indexOf(tempNode) === -1) {
                joinCandidate.push(tempNode)
                logger.warn(`STOCH PING :: new join candidate suggested by ${_node} : {${tempNode}}`)
              }
            }

          // but we trust the callee 100% so we set it's availability to full
            SR.outOfReachNodes[_node] = 0
            logger.debug(`${wrapper('bold', 'PING')} success :: response = ${JSON.stringify(body)}`)
          } else {
            failed = true
            if (SR.outOfReachNodes[_node]) {
              if (SR.outOfReachNodes[_node] === (kick) && SR.foreignNodes[_node]) {
                logger.error(`STOCH PING :: removing node {${node}} from foreignNodes and nodes list`)
                SR.kickNode(_node)
                interval = minInterval
              } else {
                SR.outOfReachNodes[_node] += 1
              }
            } else {
              SR.outOfReachNodes[_node] = 1
            }
            logger.error(`STOCH PING :: Error: ${_node} has been out of reach for ${SR.outOfReachNodes[_node]} pings ::  ${JSON.stringify(err)}`)
          }

          if (_node === last) {
            failed ? decreseTrust() : increaseTrust()
            for (let cNode of joinCandidate) {
              SR.transport.send({node: cNode, route: routePrefix}, function (__node, err, body, res) {
              // this candidate has failed to prove itself
                if (err) {
                  logger.error(`STOCH PING :: join candidate ${__node} rejected due to ${err}`)
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

  function onPingReceive (sender, response) {
    if (CONFIG.getSystemConf().nodes.indexOf(sender) === -1) {
      logger.warn(`STOCH PING :: new node is pinging me. adding to joinCandidate list. address : ${sender}`)
      joinCandidate.push(sender)
    }
    logger.debug(`STOCH PING :: Responding a PING message from ${sender}`)
    response.end(JSON.stringify({
      services: SR.services.serializedTree,
      nodes: CONFIG.getSystemConf().nodes,
      transportServers: SR.transport.getServerRoutes()}))
  }

  function _pingEvent (xMessage, next, end, xyz) {
    let response = xMessage.response
    let sender = xMessage.message.xyzPayload.senderId
    let _transport = xyz.serviceRepository.transport.servers[port]

    logger.silly(`STOCH PING :: Passing ping to up to service repo`)
    _transport.emit(CONSTANTS.events.PING, sender, response)
    next()
  }

  let pingReceiveMiddlewareStack = new GenericMiddlewareHandler(xyz, `${routePrefix}.receive.mw`, routePrefix)
  let pingDispatchMiddlewareStack = new GenericMiddlewareHandler(xyz, `${routePrefix}.dispatch.mw`, routePrefix)
  pingReceiveMiddlewareStack.register(0, _pingEvent)
  pingDispatchMiddlewareStack.register(0, _httpExport)

  SR.transport.registerRoute(routePrefix, pingDispatchMiddlewareStack)
  SR.transport.servers[port].registerRoute(routePrefix, pingReceiveMiddlewareStack)

  SR.transport.servers[port].on(CONSTANTS.events.PING, onPingReceive)

  logger.info(`STOCH PING :: stochastic ping bootstraped for approx. every ${interval} ms`)

  if (event) {
    logger.info('STOCH PING :: ipc channel created from stochastic ping')
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
