/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const agenda = require('./lib/agenda.js')

agenda.on('ready', async () => {
  require('./lib/job.js')(agenda)
  agenda.start()
})

agenda.on('fail', (err, job) => {
  const jobData = job.attrs.data
  console.error(`[${jobData.orgId}] Job failed with error: ${err.message}`)
})

async function graceful () {
  console.log(`Worker #${process.pid} shutting down`)
  await agenda.stop()
  process.exit(0)
}

process.on('SIGTERM', graceful)
process.on('SIGINT', graceful)
console.log(`Worker #${process.pid} online`)
