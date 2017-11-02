/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const massive = require('massive')
// const monitor = require('pg-monitor')
const loop = require('deasync').runLoopOnce

const deasyncPromise = function (promise) {
  let result
  let done = false
  promise.then(res => {
    result = res
    // monitor.attach(res.driverConfig)
    done = true
  }).catch(e => {
    console.error('Error while connecting to DB:', e)
  })
  while (!done) {
    loop()
  }
  return result
}

let db = massive(process.env.DATABASE_URL)
module.exports = deasyncPromise(db)
