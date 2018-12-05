/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const path = require('path')
const express = require('express')
const helmet = require('helmet')
const forcetls = require('force-ssl-heroku')
const compression = require('compression')
const passport = require('passport')
const session = require('express-session')
const bodyparser = require('body-parser')
const routes = require('./routes/index.js')
const db = require('./lib/db.js')
const serializeError = require('serialize-error')

/* Express Config */
let app = express()
app.use(helmet())
app.use(forcetls)
app.use(compression())
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views'))
app.set('json spaces', 2)
app.use('/public', express.static(path.join(__dirname, '/public')))

app.use(bodyparser.json()) // for parsing application/json
app.use(bodyparser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(session({
  name: 'sid',
  secret: process.env.COOKIE_SECRET || 'change me',
  proxy: true,
  resave: true,
  saveUninitialized: true,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: true,
    maxAge: 3600000 // 1 hour
  }
}))

/* Set DB var */
app.set('db', db)

/* Passport */
require('./lib/passport')(passport)
app.use(passport.initialize())
app.use(passport.session())

/* Routes */
app.use('/', routes)

/* Start */
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

/* Error handlers */
app.use((err, req, res, next) => {
  let email = (req.user && req.user.email) || 'user@example.org'
  console.error(`[${email}] Unhandled application error`, serializeError(err))
  res.status(500).send(err)
})
