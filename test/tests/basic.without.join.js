const test = require('./../common').test
const expect = require('chai').expect
const _send = test.sendMessage

let processes
let identifiers = []
let TESTER
const TOTAL = 2 + 1 // + tester node
before(function (done) {
  this.timeout(40 * 1000)
  test.setUpTestEnv((p) => {
    processes = p
    identifiers = Object.keys(processes)
    TESTER = test.getTester()
    setTimeout(done, 10 * 1000)
  }, 'xyz.test.no.join.json')
})

it('initial state', function (done) {
  _send('inspectJSON', processes[identifiers[0]], (data) => {
    expect(data.global.systemConf.nodes.length).to.equal(TOTAL)
    expect(Object.keys(data.ServiceRepository.foreignServices)).to.have.lengthOf(TOTAL)
    _send('inspectJSON', processes[identifiers[1]], (data) => {
      expect(Object.keys(data.ServiceRepository.foreignServices)).to.have.lengthOf(TOTAL)
      expect(data.global.systemConf.nodes).to.have.lengthOf(TOTAL)
      done()
    })
  })
})

it('remove one of them', function (done) {
  this.timeout(60 * 1000)
  TESTER.call({
    servicePath: 'node/kill',
    payload: `0`
  }, (err, body, resp) => {
    expect(body).to.equal('Done')
    setTimeout(() => {
      _send('inspectJSON', processes[identifiers[1]], (data) => {
        console.log(data.global.systemConf)
        expect(data.global.systemConf.nodes).to.have.lengthOf(TOTAL - 1)
        expect(Object.keys(data.ServiceRepository.foreignServices)).to.have.lengthOf(TOTAL - 1)
        done()
      })
    }, 15 * 1000)
  })
})

after(function () {
  for (let p in processes) {
    processes[p].kill()
  }
})
