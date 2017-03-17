var XYZ = require('xyz-core')
let fn = require('./../../mock.functions')

var stringMs = new XYZ({
  selfConf: {
    logLevel: 'debug',
    name: 'string.ms',
    host: '127.0.0.1',
    defaultBootstrap: false,
    transport: [{type: 'HTTP', port: 5000}]
  },
  systemConf: {
    nodes: []
  }
})

stringMs.bootstrap(require('./../../../ping.stochastic'), {
  routePrefix: 'S_PING'
})
stringMs.register('/string/down', fn.down)
stringMs.register('/string/up', fn.up)
stringMs.register('/finger', fn.finger)

setInterval(() => {
  stringMs.call({servicePath: '/math/decimal/mul', payload: {x: 2, y: 3}}, (err, body, res) => {
    console.log(err, body)
  })
}, 3000)
