let XYZ = require('xyz-core')
let fn = require('./../../mock.functions')

var mathMs = new XYZ({
  selfConf: {
    name: 'math.ms',
    host: '127.0.0.1',
    defaultBootstrap: false
  },
  systemConf: {nodes: []}
})

mathMs.bootstrap(require('./../../../ping.stochastic'), {
  interval: 2000,
  event: true,
  maxInterval: 50 * 1000,
  routePrefix: 'S_PING'
})
mathMs.register('/math/decimal/mul', fn.mul)
mathMs.register('/math/decimal/neg', fn.neg)
mathMs.register('/math/decimal/sub', fn.sub)

mathMs.register('/math/float/neg', function (payload, XResponse) {
  XResponse.send('ok whassssaaaap')
})
//
// setInterval(() => {
//   mathMs.call({servicePath: '/string/up', payload: 'hello'}, (err, body, response) => {
//     console.log(err, body)
//   })
// }, 10000)

// console.log(mathMs)
