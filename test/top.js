describe('basic', function () {
  require('./tests/basic.js')
})

describe('no join', function () {
  require('./tests/basic.without.join')
})
describe('join', function () {
  require('./tests/basic.with.join')
})
