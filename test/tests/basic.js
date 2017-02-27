const test = require('./../common').test
const expect = require('chai').expect
const _send = test.sendMessage

let processes
let identifiers = []
let TESTER
let lastValue
before(function (done) {
  test.setUpTestEnv((p) => {
    processes = p
    identifiers = Object.keys(processes)
    TESTER = test.getTester()
    done()
  })
})

it('initial state', function (done) {
  _send('pingRate', processes[identifiers[0]], (data) => {
    expect(data.interval).to.be.within(2000, 5000)
    done()
  })
})

it('interval should increase', function (done) {
  setTimeout(() => {
    _send('pingRate', processes[identifiers[0]], (data) => {
      lastValue = data.interval
      expect(data.interval).to.be.within(10000, 20000)
      done()
    })
  }, 15000)
  this.timeout(20000)
})

it('interval should increase when a node goes down', function (done) {
  TESTER.call({servicePath: 'node/kill', payload: '1'}, (err, body) => {
    expect(body).to.equal('Done')
    setTimeout(() => {
      _send('pingRate', processes[identifiers[0]], (data) => {
        expect(data.interval).to.be.below(lastValue)
        done()
      })
    }, 10000)
  })
  this.timeout(20000)
})

after(function () {
  for (let p in processes) {
    processes[p].kill()
  }
})
