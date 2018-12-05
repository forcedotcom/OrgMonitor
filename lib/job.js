/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const Org = require('./org.js')

module.exports = function (agenda) {
  agenda.define('refreshOrg', async (job, done) => {
    const jobData = job.attrs.data

    // reset the lock every min
    const touch = setInterval(() => {
      console.log(`[${jobData.orgId}] Touching job..`)
      job.touch()
    }, 1 * 60 * 1000)

    // kill job after certain time
    const kill = setTimeout(() => {
      console.log(`[${jobData.orgId}] Killing job..`)
      clearInterval(touch)
      done(new Error(`Timeout`))
    }, 45 * 60 * 1000)

    console.log(`[${jobData.orgId}] Syncing..`)
    let org = await Org.get(jobData.orgId)
    let data = await org.fetchRemoteData()
    await Org.saveData(data)
    clearTimeout(kill)
    clearInterval(touch)
    done()
  })

  agenda.define('deleteOldRecords', async (job, done) => {
    console.log(`Deleting old records..`)
    await Org.deleteOldRecords()
    done()
  })

  agenda.define('deleteOrg', async (job, done) => {
    const jobData = job.attrs.data
    console.log(`Deleting Org ${jobData.orgId}..`)
    await Org.delete(jobData.orgId)
    done()
  })
}
