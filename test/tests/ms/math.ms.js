let XYZ = require('xyz-core')
let fn = require('./../../mock.functions')

var mathMs = new XYZ({
  selfConf: {
    name: 'math.ms',
    host: '127.0.0.1',
    logLevel: 'verbose',
    defaultBootstrap: false
  },
  systemConf: {nodes: []}
})

mathMs.bootstrap(require('./../../../ping.stochastic'), {
  interval: 2000,
  event: true,
  maxInterval: 10 * 1000,
  minInterval: 1 * 1000
})
mathMs.register('/math/decimal/mul', fn.mul)
mathMs.register('/math/decimal/neg', fn.neg)
mathMs.register('/math/decimal/sub', fn.sub)

mathMs.register('/math/float/neg', function (payload, XResponse) {
  XResponse.send('ok whassssaaaap')
})

console.log(mathMs)
