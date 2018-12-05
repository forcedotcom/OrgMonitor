/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const express = require('express')
const router = express.Router()
const jsforce = require('jsforce')
const compare = require('secure-compare')
const Org = require('../lib/org.js')
const Crypto = require('../lib/crypto.js')
const oauth2model = require('../lib/oauth2.js')
const agenda = require('../lib/agenda.js')
const passport = require('passport')
const Promise = require('bluebird')
const serializeError = require('serialize-error')

/* Saml */

const SAMLauthed = (req, res, next) => {
  if (req.isAuthenticated() || process.env.NODE_ENV === 'development') return next()
  res.redirect('/login')
}

router.get('/login', passport.authenticate('saml', { successRedirect: '/', failureRedirect: '/login' }))
router.post('/login/callback', passport.authenticate('saml', { successRedirect: '/', failureRedirect: '/login' }))

/* Setup */

router.get('/setup', SAMLauthed, async (req, res) => {
  const db = req.app.get('db')
  /* Create required tables */
  try {
    let job = agenda.create('deleteOldRecords', { id: 1 })
    job.unique({ id: 1 }) // guarantees uniqueness
    job.repeatEvery('1 day')
    job.save()

    await db.createDocumentTable('creds')
    await db.createDocumentTable('orgsdata')
    console.log(`Successfully setup DB`)
    res.json({ success: true, todo: 'Restart app now' })
    // TODO - should look to refresh the DB automatically, i.e. db.reload() and pass it to modules
  } catch (e) {
    console.log(`Error while setting up DB`, e)
    res.json({ success: false, error: e.message })
  }
})

/* Oauth */

router.get('/add/:type', (req, res) => {
  let oauth2 = oauth2model
  let loginUrl = 'https://login.salesforce.com'
  if (req.params.type === 'sandbox') loginUrl = 'https://test.salesforce.com'
  oauth2.loginUrl = loginUrl
  res.redirect(new jsforce.OAuth2(oauth2).getAuthorizationUrl({ scope: 'api refresh_token' }))
})

router.get('/callback', async (req, res) => {
  const code = req.query.code
  const conn = new jsforce.Connection({ oauth2: new jsforce.OAuth2(oauth2model) })

  try {
    await conn.authorize(code)
  } catch (e) {
    return res.json({ success: false, error: e.message }) // invalid grant
  }

  const userInfo = await conn.identity()
  const db = req.app.get('db')

  let env = {
    username: userInfo.username,
    orgId: userInfo.organization_id,
    instanceUrl: conn.instanceUrl,
    loginUrl: conn.loginUrl,
    refreshToken: Crypto.encrypt(conn.refreshToken),
    healthCheckScore: 'Syncing..'
  }

  // Store credentials in DB
  try {
    let credentials = await db.creds.findDoc({ orgId: userInfo.organization_id })
    if (credentials.length > 0) env.id = credentials[0].id
    await db.creds.saveDoc(env) // create or update
    console.log(`[${env.orgId}] Successfully stored credentials`)
  } catch (e) {
    console.error(`[${env.orgId}] Error while storing credentials`, serializeError(e))
    return res.json({ success: false, error: e.message })
  }

  // Schedule data refresh job
  try {
    let job = agenda.create('refreshOrg', { orgId: env.orgId })
    job.unique({ orgId: env.orgId }) // guarantees uniqueness
    job.repeatEvery('1 hour')
    job.save()
    console.log(`[${env.orgId}] Successfully scheduled job`)
  } catch (e) {
    console.error(`[${env.orgId}] Error while scheduling job`, serializeError(e))
    return res.json({ success: false, error: e.message })
  }

  res.redirect('/')
})

/* Other routes */

router.get('/', SAMLauthed, async (req, res) => {
  try {
    const creds = await Org.getAllCreds()
    res.render('orgs', {
      creds: creds
    })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

router.get('/rank', SAMLauthed, async (req, res) => {
  const orgs = await Org.getAllCreds()
  let orgsData = await Promise.map(orgs, async org => {
    return org.getData()
  })
  res.render('rank', {
    orgs: orgsData
  })
})

router.get('/get/:orgId', SAMLauthed, async (req, res) => {
  const orgId = req.params.orgId
  try {
    const org = await Org.get(orgId)
    const dbdata = await org.getData()
    res.render('org', {
      org: org, // needed for name and username
      orgData: dbdata // actual data
    })
  } catch (e) {
    res.json({ success: false, err: e.message })
  }
})

router.get('/json/:orgId', SAMLauthed, async (req, res) => {
  const orgId = req.params.orgId
  try {
    const org = await Org.get(orgId)
    let dbdata = await org.getData()
    res.json(dbdata)
  } catch (e) {
    res.json({ success: false, err: e.message })
  }
})

/* Admin functions */

router.post('/wipe/:orgId', async (req, res) => {
  const adminToken = req.get('Admin-Token')
  if (!compare(adminToken, process.env.ADMIN_TOKEN)) return res.json({ success: false, err: 'Invalid token' })
  const orgId = req.params.orgId
  try {
    agenda.now('deleteOrg', { orgId: orgId })
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, err: e })
  }
})

router.post('/edit/:orgId', async (req, res) => {
  // i.e. { "attributes": [{ "name": "Some attribute", "color": "blue" }, { "name": "Some other attribute", "color": "black" }] }
  const orgId = req.params.orgId
  const adminToken = req.get('Admin-Token')
  if (!compare(adminToken, process.env.ADMIN_TOKEN)) return res.json({ success: false, err: 'Invalid token' })

  let data = req.get('Data')
  try {
    data = JSON.parse(data)
  } catch (e) {
    return res.json({ success: false, error: 'Invalid data' })
  }

  try {
    let org = await Org.get(orgId)
    await org.set(data)
    res.json({ success: true })
  } catch (e) {
    res.json({ success: false, err: e.message })
  }
})

router.post('/refresh', async (req, res) => {
  const adminToken = req.get('Admin-Token')
  if (!compare(adminToken, process.env.ADMIN_TOKEN)) return res.json({ success: false, err: 'Invalid token' })
  const creds = await Org.getAllCreds()
  creds.map(async cred => {
    agenda.now('refreshOrg', { orgId: cred.orgId })
  })
  res.send({ success: true })
})

router.post('/reschedule', async (req, res) => {
  // Delete existing records first, i.e.: db.getCollection('agendaJobs').remove({})
  const adminToken = req.get('Admin-Token')
  if (!compare(adminToken, process.env.ADMIN_TOKEN)) return res.json({ success: false, err: 'Invalid token' })
  try {
    const creds = await Org.getAllCreds()
    creds.map(async cred => {
      let job = agenda.create('refreshOrg', { orgId: cred.orgId })
      job.unique({ orgId: cred.orgId }) // guarantees uniqueness
      job.repeatEvery('1 hour')
      job.save()
      console.log(`[${cred.orgId}] Successfully scheduled job`)
    })

    let job = agenda.create('deleteOldRecords', { id: 1 })
    job.unique({ id: 1 }) // guarantees uniqueness
    job.repeatEvery('1 day')
    job.save()

    res.send({ success: true })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

module.exports = router
