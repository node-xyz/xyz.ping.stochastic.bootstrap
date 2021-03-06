const test = require('./../common').test
const expect = require('chai').expect
const _send = test.sendMessage

let processes
let identifiers = []
let TESTER
let lastValue
before(function (done) {
  this.timeout(3000)
  test.setUpTestEnv((p) => {
    processes = p
    identifiers = Object.keys(processes)
    TESTER = test.getTester()
    done()
  })
})

it('initial state', function (done) {
  _send('pingRate', processes[identifiers[0]], (data) => {
    // 2000 it should be
    expect(data.interval).to.be.above(1500)
    done()
  })
})

it('interval should increase', function (done) {
  setTimeout(() => {
    _send('pingRate', processes[identifiers[0]], (data) => {
      lastValue = data.interval
      expect(data.interval).to.be.above(2000)
      done()
    })
  }, 10 * 1000)
  this.timeout(20000)
})

it('interval should decrease when a node goes down', function (done) {
  TESTER.call({servicePath: 'node/kill', payload: '1'}, (err, body) => {
    expect(body).to.equal('Done')
    setTimeout(() => {
      _send('pingRate', processes[identifiers[0]], (data) => {
        expect(data.interval).to.be.below(lastValue + 1)
        done()
      })
    }, 10 * 1000)
  })
  this.timeout(40 * 1000)
})

after(function () {
  for (let p in processes) {
    processes[p].kill()
  }
})
