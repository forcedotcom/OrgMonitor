/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const jsforce = require('jsforce')
const _ = require('lodash')
const Promise = require('bluebird')
const omitDeep = require('omit-deep')
const db = require('./db.js')
const Crypto = require('./crypto.js')
const questions = require('./questions.js')
const oauth2model = require('./oauth2.js')
// const agenda = require('../worker.js')
const agenda = require('./agenda.js')
const numeral = require('numeral')
const serializeError = require('serialize-error')

class Org {
  constructor (options) {
    if (!options) throw new Error('Need options')
    let oauth2 = oauth2model
    oauth2.loginUrl = options.loginUrl || 'https://login.salesforce.com'
    Object.assign(this, options)

    this.connection = new jsforce.Connection({
      oauth2: new jsforce.OAuth2(oauth2),
      instanceUrl: options.instanceUrl,
      refreshToken: Crypto.decrypt(options.refreshToken)
    })

    this.connection.on('refresh', (accessToken, res) => {
      console.log(`[${this.orgId}] Refreshing Oauth2 token..`)
      this.connection.accessToken = accessToken
    })
  }

  fetchRemoteData () {
    const that = this
    const query = (question) => {
      return new Promise(async (resolve, reject) => {
        let queryMethod = 'connection.query'
        let queryMoreMethod = 'connection.queryMore'
        if (question.engine === 'tooling') {
          queryMethod = 'connection.tooling.query'
          queryMoreMethod = 'connection.tooling.queryMore'
        }

        const run = (namespace, options, callback) => {
          var context = that
          var namespaces = namespace.split('.')
          var func = namespaces.pop()
          for (var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]]
          }
          return context[func](options, callback)
        }

        const queryMore = (data, result) => {
          data = _.union(data, result.records)

          if (!result.done) {
            console.log(`[${this.orgId}] Querying more records..`)
            run(queryMoreMethod, result.nextRecordsUrl, (err, result) => {
              if (err) reject(err)
              queryMore(data, result)
            })
          } else {
            result.records = data // to preserve other metadata info
            resolve(result)
          }
        }

        run(queryMethod, question.q, (err, result) => {
          if (err) reject(err)
          queryMore(null, result)
        })
      })
    }

    return new Promise(async (resolve, reject) => {
      console.log(`[${this.orgId}] Fetching data..`)
      let errorCount = 0

      // process questions
      let answers = await Promise.map(questions, async (question) => {
        let answer = _.clone(question)
        answer.hash = answer.name.replace(/\W+/g, '').toLowerCase()

        try {
          answer.a = await query(question)
          if (answer.a.totalSize > 3000) delete answer.a.records // not saving results from queries returning over 3k records
          // if (answer.hash === 'loginipranges' && answer.a.records) answer.a.records = _.uniqBy(answer.a.records, data => { return [data.IpStartAddress, data.IpEndAddress].join() })
        } catch (e) {
          console.error(`[${this.orgId}] Non-blocking error while querying data:`, { query: question.q, error: serializeError(e) })
          answer.a = null
          answer.error = e.errorCode || e.code || e.name || JSON.stringify(e)
          errorCount++ // increase error count
        }
        return answer
      }, {
        concurrency: 5 // queries in parallel
      })

      // API usage
      let apiLimits = that.connection.limitInfo.apiUsage || {}
      let apiAnswer = 'ERR'
      if (apiLimits.used && apiLimits.limit) {
        let apiUsed = numeral(apiLimits.used).format('0.0a')
        let apiLimit = numeral(apiLimits.limit).format('0.0a')
        apiAnswer = `${apiUsed} out of ${apiLimit}`
      }
      answers.push({
        name: 'API usage',
        hash: 'API usage'.replace(/\W+/g, '').toLowerCase(),
        icon: 'fa-terminal',
        a: {
          totalSize: apiAnswer
        }
      })

      // Set health check score against cred record
      let healthCheckScore = _.get(answers[0], 'a.records[0].Score')
      healthCheckScore = healthCheckScore ? healthCheckScore + '%' : 'ERR'
      await this.set({ healthCheckScore: healthCheckScore })

      // Done
      console.log(`[${this.orgId}] Sync complete, ${errorCount} errors`)

      // Manage failures
      if (errorCount === questions.length) {
        if (!this.failed) await this.set({ failed: true })
        console.log(`[${this.orgId}] All queries failed!`)
      } else {
        if (this.failed) await this.set({ failed: false })
      }

      resolve({
        time: Date.now(),
        orgId: this.orgId,
        answers: omitDeep(answers, ['attributes']) // remove the attributes property
      })
    })
  }

  set (data) {
    let orgid = this.orgId
    return new Promise(async (resolve, reject) => {
      try {
        let credentials = await db.creds.findDoc({ orgId: orgid })
        if (credentials.length > 0) {
          let env = credentials[0]
          let updated = _.merge(env, data)
          await db.creds.saveDoc(updated)
          console.log(`[${orgid}] Successfully saved cred record`)
          resolve()
        } else {
          reject(new Error(`[${orgid}] No such Org`))
        }
      } catch (e) {
        console.error(`[${orgid}] Error while saving cred record`, serializeError(e))
        reject(e)
      }
    })
  }

  getData (columns) {
    let orgid = this.orgId
    return new Promise(async (resolve, reject) => {
      try {
        let orgData = await db.orgsdata.findDoc({ orgId: orgid }, {
          order: [{ field: 'id', direction: 'desc' }],
          limit: 1
        })
        if (orgData.length > 0) resolve(orgData[0])
        else reject(new Error(`No data for OrgId ${orgid}`))
      } catch (e) {
        console.error(`Error while querying data for OrgId ${orgid}`, serializeError(e))
        reject(e)
      }
    })
  }

  // Static methods below

  static saveData (data) {
    return new Promise(async (resolve, reject) => {
      try {
        let result = await db.saveDoc('orgsdata', data)
        console.log(`[${data.orgId}] Successfully saved data`)
        resolve(result)
      } catch (e) {
        console.error(`[${data.orgId}] Error while saving data`, serializeError(e))
        reject(e)
      }
    })
  }

  static getAllCreds () {
    return new Promise(async (resolve, reject) => {
      try {
        let creds = await db.creds.findDoc()
        let orgs = _.map(creds, (cred) => {
          return new Org(cred)
        })
        resolve(orgs)
      } catch (e) {
        console.error(`Error while querying credentials`, serializeError(e))
        reject(e)
      }
    })
  }

  static get (orgid) {
    return new Promise(async (resolve, reject) => {
      try {
        let credentials = await db.creds.findDoc({ orgId: orgid })
        if (credentials.length > 0) {
          resolve(new Org(credentials[0]))
        } else {
          reject(new Error(`[${orgid}] No such Org`))
        }
      } catch (e) {
        console.error(`Error while querying credentials for ${orgid}`, serializeError(e))
        reject(e)
      }
    })
  }

  static delete (orgid) {
    return new Promise(async (resolve, reject) => {
      try {
        await agenda.cancel({ name: 'refreshOrg', data: { orgId: orgid } })
        console.log(`[${orgid}] Successfully deleted jobs`)
        await db.creds.destroy({ 'body.orgId': orgid })
        await db.orgsdata.destroy({ 'body.orgId': orgid })
        console.log(`[${orgid}] Successfully deleted credentials and data`)
        resolve()
      } catch (e) {
        console.error(`[${orgid}] Error while deleting Org`, serializeError(e))
        reject(e)
      }
    })
  }

  static deleteOldRecords () {
    return new Promise(async (resolve, reject) => {
      try {
        await db.delete_old_records()
        console.log(`Successfully deleted old records`)
        resolve()
      } catch (e) {
        console.error(`Error while deleting old records`, serializeError(e))
        reject(e)
      }
    })
  }
}

module.exports = Org
