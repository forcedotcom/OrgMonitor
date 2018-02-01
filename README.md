# OrgMonitor

OrgMonitor is a Salesforce Connected App written in Node.js used to gather the stats necessary to evaluate the basic security posture of a wide portfolio of Salesforce Orgs. It runs a set of SOQL queries against all connected Orgs on an hourly basis: it answers questions like "how many users/profiles/permsets/roles/classes do we have?", gives you visibility of users with high-level privileges (VAD, MAD, AuthorApex, etc), and surfaces Health Check score and risks — all from a central location.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

The application requires:

- Node.js
- Yarn
- MongoDB
- PostgreSQL
- One or more Salesforce Orgs (production or sandbox)

### Installing locally

#### Create a Connected App

1. Create a Connected App in your main Salesforce Org by navigating to Setup > Create > Apps, then click on "New"
2. Set the `Selected OAuth Scopes` value to `Access and manage your data (api)` and `Perform requests on your behalf at any time (refresh_token, offline_access)`
3. Set the `Callback URL` value to `http://localhost:3000/callback`
4. Save and note down the `Consumer Key` and `Consumer Secret` values

#### Download and run the application

1. Download this repo to your local machine
2. Create the following ENV variables:
  - `PORT` is the port the web application will run on, defaults to 3000
  - `NODE_ENV` set to `development` allows the application to bypass the built-in SAML SSO auth
  - `DATABASE_URL` is a connection string pointing to your PostgresSQL database
  - `MONGODB_URI` is a connection string pointing to your MongoDB database
  - `CLIENT_ID` is the newly created Connected App's `Consumer Key` value
  - `CLIENT_SECRET` is the newly created Connected App's `Consumer Secret` value
  - `REDIRECT_URI` is the newly created Connected App's `Callback URL` value
  - `CORP_DOMAIN` is your corporate domain (i.e.: mycompany.com) used to identify Salesforce users without corporate email
  - `COOKIE_SECRET` is a secret used to sign the session cookie
  - `ADMIN_TOKEN` is a secret used to edit/delete Org information such as name or description
  - `ENCRYPTION_KEY` is a hex string representing 32 random bytes, used to encrypt/decrypt the Oauth refresh tokens (AES 256)
3. Install Node.js dependencies through Yarn, with `yarn install`
4. Run the server with `node server.js`, confirm you see the `App listening on port 3000` message in the console
5. Load `http://localhost:3000/setup`, confirm you see the `Successfully setup DB` message in the console
6. Kill and restart the server with `node server.js` and start the worker with `node worker.js`
7. Load `http://localhost:3000` and you should now see the OrgMonitor homepage

#### Create a dedicated user for OrgMonitor in each of your Orgs, and connect them to OrgMonitor

1. It's recommended to create a dedicated user/profile for OrgMonitor with no CRUD access and only `API Enabled`, `View All Users`, `View Health Check` and `View Setup and Configuration` permissions, with proper IP whitelisting
2. You're now ready to connect your Salesforce Orgs by navigating to `http://localhost:3000/add/prod` for Production Orgs, or `http://localhost:3000/add/sandbox` for Sandbox Orgs, logging in with the credentials of the newly created users, and accepting the Oauth request

### Deployment

When ready for production deployment:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

1. Edit the Connected App and include the new hostname to the `Callback URL` value
2. Update the application's `REDIRECT_URI` value to match the `Callback URL` 
3. Update the application's `NODE_ENV` value to `production` and add the following ENV variables (refer to the [Passport-SAML](https://github.com/bergie/passport-saml) documentation on how to set these) to enable SAML SSO auth in order to protect access to the application's data:
  - `SAML_ENTRY_POINT`
  - `SAML_ISSUER`
  - `SAML_CALLBACK`
  - `SAML_CERT`

## License

Copyright (c) 2017, salesforce.com, inc.  
All rights reserved.  
Licensed under the BSD 3-Clause license.  
For full license text, see LICENSE file in the repo root or [https://opensource.org/licenses/BSD-3-Clause](https://opensource.org/licenses/BSD-3-Clause)
