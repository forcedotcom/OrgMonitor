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
  - `ENCRYPTION_KEY` is 32 random bytes (**Please Note:** MUST be hex encoded), used to encrypt/decrypt the Oauth refresh tokens (AES 256)
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

1. Edit the Connected App and include the new hostname to the `Callback URL` value
2. Update the application's `REDIRECT_URI` value to match the `Callback URL` 
3. Update the application's `NODE_ENV` value to `production` and add the following ENV variables (refer to the [Passport-SAML](https://github.com/bergie/passport-saml) documentation on how to set these) to enable SAML SSO auth in order to protect access to the application's data:
  - `SAML_ENTRY_POINT`
  - `SAML_ISSUER`
  - `SAML_CALLBACK`
  - `SAML_CERT` (maps to the 'cert' configuration parameter: *"Identity Provider's public PEM-encoded X.509 signing certificate using the cert confguration key. The "BEGIN CERTIFICATE" and "END CERTIFICATE" lines should be stripped out and the certificate should be provided on a single line."*)

### Deployment to Heroku
Below are complete steps to deploy the application on Heroku. If you do not have a Heroku account head over to https://signup.heroku.com to create an account first. Once you have an account ensure you have the Heroku CLI (command line interface) installed (see https://devcenter.heroku.com/articles/heroku-cli). The below steps walks through setting up Org Monitor with a Developer Org but the steps applies equally well to a Production org.

#### Clone Git Repo and Create App
```bash
# clone repo
$ git clone git@github.com:forcedotcom/OrgMonitor.git
$ cd OrgMonitor

# create app (also sets git remote)
$ heroku apps:create --region eu

# get appname from git remote
$ APP_NAME=`git remote get-url heroku | cut -d'/' -f4 | cut -d'.' -f1`
$ echo $APP_NAME
funky-medina-23982
```

*Please Note:* Below I simply use funky-medina-23982 to refer to the app on Heroku i.e. what the APP_NAME variable contains now.

#### Create Connected App in Salesforce
1. Open Salesforce Setup
2. Search for "App Manager"
3. Click "New Connected App" and fill in
  - Connected App Name
  - API Name
  - Contact Email
4. Check "Enable OAuth Settings"
5. Set "Callback URL" to https://funky-medina-23982.herokuapp.com/callback (replace with actual app name)
6. Select the following OAuth Scopes:
  - Access and manage your data (api)
  - Perform requests on your behalf at any time (refresh_token, offline_access)
7. Save to close

#### Gather Info (to replace below)
1. Reopen the Connected app and note down the "Consumer Key" (`CLIENT_ID`) and "Consumer Secret" (`CLIENT_SECRET`))
2. Hex encode 32 characters of random characters (http://www.convertstring.com/EncodeDecode/HexEncode) (`ENCRYPTION_KEY`)
3. Create yourself a password for `ADMIN_TOKEN`
4. Create yourself a password for `COOKIE_SECRET`

#### Configure Heroku app, push source and open
```bash
# create addons and set config
heroku addons:create mongolab:sandbox
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set CLIENT_ID=foo
heroku config:set CLIENT_SECRET=bar
heroku config:set REDIRECT_URI=https://$APP_NAME.herokuapp.com/callback
heroku config:set CORP_DOMAIN=lekkimworld.com
heroku config:set COOKIE_SECRET=baz
heroku config:set ADMIN_TOKEN=gaz
heroku config:set ENCRYPTION_KEY=3242384142324532343230334337313636384446313944453334394630334436
heroku config:set NODE_ENV=development

# push app source to Heroku
git push heroku master

# start worker dyno
heroku ps:scale -a $APP_NAME worker=1:free

# load /setup to configure app
curl https://$APP_NAME.herokuapp.com/setup

# restart app
heroku restart -a $APP_NAME

# open app in browser
open https://$APP_NAME.herokuapp.com
```

#### Test it out!
Now is a good time to ensure you can open the app in the browser. From here either follow the next section on how to configure SAML for authentication or skip it to move to adding an org to OrgMonitor.

#### My Domain and SAML
1. In Salesforce Setup enable My Domain and deploy to all users (if not enabled). Note down the custom domain you've chosen. Below I use `demoitout.my.salesforce.com` (see when I set SAML_ENTRY_POINT)
2. Search for "Identity Provider" in Setup and ensure Identity Provider is enabled
3. Search for "Single Sign-On Setings" in Setup and open
4. Ensure "SAML Enabled" is checked
5. Open the Connected App you created earlier
6. Check "Enable SAML"
7. Fill in
  - Entity Id: "funky-medina-23982" (use actual app name)
  - ACS URL: https://funky-medina-23982.herokuapp.com/login/callback
8. Save to close

```bash
# configure app to use SAML for login
heroku config:set SAML_CALLBACK=https://$APP_NAME.herokuapp.com/login/callback
heroku config:set SAML_ISSUER=$APP_NAME
heroku config:set SAML_CERT=MIIErDCCA...96TOK7Ph
heroku config:set SAML_ENTRY_POINT=https://demoitout.my.salesforce.com/idp/endpoint/HttpRedirect

# set NODE_ENV to production to require authentication
heroku config:set -a $APP_NAME NODE_ENV=production

# open app to ensure it requires to to authenticate
open https://$APP_NAME.herokuapp.com
```

#### Create Salesforce user and Profile
1. Open Salesforce Setup
2. Clone the "Standard User" Profile and call it "Org Monitor" (or what ever you wish) and remove all rights, CRUD access etc. Now check the following permissions:
  - `API Enabled`
  - `View All Users`
  - `View Health Check`
  - `View Setup and Configuration`
3. Ensure the Profile allows access to the Connected App you created
4. Save the Profile
5. Create a new user assigning the Profile you just created. Remove all rights. Login as the created user using the reset-link as normal.

#### Add org to OrgMonitor
1. Open the app to /add/prod to add a Production / Developer org (using https://login.salesforce.com for login) or /add/sandbox to add a Sandbox org (using https://test.salesforce.com for login)
2. Perform OAuth authorization
3. Ensure org shows up in OrgMonitor with data

## License

Copyright (c) 2017, salesforce.com, inc.  
All rights reserved.  
Licensed under the BSD 3-Clause license.  
For full license text, see LICENSE file in the repo root or [https://opensource.org/licenses/BSD-3-Clause](https://opensource.org/licenses/BSD-3-Clause)
