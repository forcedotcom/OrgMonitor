/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

const Agenda = require('agenda')
const mongoConnectionString = process.env.MONGODB_URI
const agenda = new Agenda({db: {address: mongoConnectionString}})

agenda.on('ready', function () {
  agenda.start()
})

module.exports = agenda
