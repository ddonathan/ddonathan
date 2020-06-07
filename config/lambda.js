let AWS = require('aws-sdk');
let url = require('url');
let qs = require('querystring');
let request = require('request');
var axios = require('axios');
var moment = require('moment-timezone');
const middy = require('middy');
const correlationIds = require('@dazn/lambda-powertools-middleware-correlation-ids');
const stopInfiniteLoop = require('@dazn/lambda-powertools-middleware-stop-infinite-loop');
const epsagon = require('epsagon');
epsagon.init({
  token: '75981d32-8205-4a6d-be1a-d2057d1c8396',
  appName: 'bullhornAuth',
  metadataOnly: false
});

let secretManager = new AWS.SecretsManager({});
var dynamodb = new AWS.DynamoDB();

//
//  This method will get a API Key from Bullhorn to perform requests to their API.
//
exports.handler = epsagon.lambdaWrapper(middy(async (container, context, callback) => {
  try {
    // Check for a current session
    container = await getSessionInfo(container);

    // If the session isn't valid, go through the login process
    if (container.client_credentials.sessionIsValid !== 1) {
      console.log('Starting Bullhorn Auth...');
      container = await getSecrets(container);
      container = await getAuthorizationCode(container);
      container = await getAccessToken(container);
      container = await logIn(container);
      container = await saveSessionInfo(container);
    }

    // We don't need the client_credentials portion now that we're through. Delete before returning.
    delete container.client_credentials;
  } catch (error) {
    let response = {
      statusCode: error.status || 500,
      // headers: headersToSend,
      body: error
    };
    //  ->  Tell lambda that we finished
    return response;
  }

  //  ->  Tell lambda that we finished
  return container.bh_auth;
}).use(correlationIds({ sampleDebugLogRate: 1 }))
  .use(stopInfiniteLoop(10))
);

//
//  Functions
//

// Check to see if we have a valid session for this client
function getSessionInfo (container) {
  return new Promise(function (resolve, reject) {
    console.log('getSessionInfo', container.client_name);

    container.client_credentials = { sessionIsValid: 0 };

    // Lookup session info from DynamoDB
    var params = {
      TableName: 'session_info_bh',
      Key: { client_name: { S: container.client_name } },
      AttributesToGet: ['rest_token', 'rest_url', 'refresh_token'],
      ConsistentRead: false, // optional (true | false)
      ReturnConsumedCapacity: 'NONE' // optional (NONE | TOTAL | INDEXES)
    };

    dynamodb.getItem(params, function (err, data) {
      if (err) {
        console.log(err); // an error occurred
        process.exit(1);
      } else {
        container.bh_auth = AWS.DynamoDB.Converter.unmarshall(data.Item);

        // Make ping call to Bullhorn
        axios
          .get(`${container.bh_auth.rest_url}ping`, { headers: { BhRestToken: container.bh_auth.rest_token } })
          .then(function (response) {
            // Success means we got a valid response from Bullhorn, which means we have a valid session. If we have less than 15 minutes left, mark the session as invalid so we'll get a new token.
            let validSeconds = moment(response.data.sessionExpires).unix() - moment().unix();
            if (validSeconds > 900) {
              console.log(`Session is valid for ${validSeconds} more seconds.`);
              container.client_credentials = { sessionIsValid: 1 };
            }
          })
          .catch(function (error) {
            // An error means the session is no longer valid
            container.error = error;
            return resolve(container);
          })
          .then(function () {
            // always executed
            return resolve(container);
          });
      }
    });
  });
}

// Get secrets from secrets manager based on client name
function getSecrets (container) {
  return new Promise(function (resolve, reject) {
    console.log('getSecrets', container.client_name);

    //  Set what secrets do we need
    let options = { SecretId: 'bh_' + container.client_name };

    //  Execute the query
    secretManager.getSecretValue(options, function (error, data) {
      //  Check for a internal error
      if (error) {
        console.log('GetAWSSecrets-error:', JSON.stringify(error, null, 4));
        return reject(error);
      }

      //  Covert the credential in the default object used across the execution.
      let secrets = JSON.parse(data.SecretString);
      container.client_credentials = {
        client_id: secrets.client_id,
        username: secrets.username,
        password: secrets.password,
        swimlane_name: secrets.swimlane_name,
        secret: secrets.client_secret
      };

      // Save shared_secret to the container
      container.bh_auth.shared_secret = secrets.shared_secret;

      // Move to the next chain
      return resolve(container);
    });
  });
}

//
//  Start an oAuth 2.0 flow by asking the authorization code.
//
function getAuthorizationCode (container) {
  return new Promise(function (resolve, reject) {
    console.log('getAuthorizationCode', container.client_name);

    //  1.  Prepare the query
    let options = {
      url: `https://auth-${container.client_credentials.swimlane_name}.bullhornstaffing.com/oauth/authorize`,
      qs: {
        username: container.client_credentials.username,
        password: container.client_credentials.password,
        client_id: container.client_credentials.client_id,
        response_type: 'code',
        action: 'Login'
      }
    };

    //  ->  Execute
    request.post(options, function (error, response, body) {
      //  1.  Check if there was an internal error
      if (error) {
        return reject(error);
      }

      if (!response.headers.location) {
        return reject(new Error('Missing Header Location'));
      }

      //  2.  Parse the URL that we got back from the response
      let parsedURL = url.parse(response.headers.location);

      //  3.  Extract the code that we need to use for the subsequent query.
      container.client_credentials.authorization_code = qs.parse(parsedURL.query).code;

      // Move to the next chain
      return resolve(container);
    });
  });
}

//
//  Once we have the auth code, get access token
//
function getAccessToken (container) {
  return new Promise(function (resolve, reject) {
    console.log('getAccessToken', container.client_name);

    //  1.  Prepare the query
    let options = {
      url: `https://auth-${container.client_credentials.swimlane_name}.bullhornstaffing.com/oauth/token`,
      json: true,
      qs: {
        grant_type: 'authorization_code',
        code: container.client_credentials.authorization_code,
        client_id: container.client_credentials.client_id,
        client_secret: container.client_credentials.secret
      }
    };

    //  ->  Execute
    request.post(options, function (error, response, body) {
      //  1.  Check if there was an internal error
      if (error) {
        return reject(error);
      }

      //  2.  Make sure we got the body and within the body we have the accesss token.
      if (!body || !body.access_token) {
        //  <>  Debug
        console.log(body);

        //  1.  Stop excution and throw an error.
        return reject(new Error(body.error));
      }

      //  3.  Save the Access Token for the next Promise.
      container.client_credentials.access_token = body.access_token;
      container.client_credentials.refresh_token = body.refresh_token;

      //  ->  Move to the next chain
      return resolve(container);
    });
  });
}

//
//  We exchange the code for the API Token to be used in each request.
//
function logIn (container) {
  return new Promise(function (resolve, reject) {
    console.log('logIn', container.client_name);

    //  1.  Prepare the query
    let options = {
      url: `https://rest-${container.client_credentials.swimlane_name}.bullhornstaffing.com/rest-services/login`,
      json: true,
      qs: {
        version: '2.0',
        access_token: container.client_credentials.access_token
      }
    };

    //  ->  Execute
    request.post(options, function (error, response, body) {
      //  1.  Check if there was an internal error.
      if (error) {
        return reject(error);
      }

      //  2.  Check if we got all the data that we care about.
      if (!body || !body.BhRestToken || !body.restUrl) {
        //  <>  Debug.
        // console.log(body);

        //  1.  Stop excution and throw an error.
        return reject(new Error('BhRestToken or restUrl not in response body'));
      }

      //  3.  Save the result for the next promise.
      container.bh_auth.rest_token = body.BhRestToken;
      container.bh_auth.rest_url = body.restUrl;

      //  ->  Move to the next chain
      return resolve(container);
    });
  });
}

//
// Create backup to dynamoDB
//
async function saveSessionInfo (container) {
  return new Promise(function (resolve, reject) {
    console.log('saveSessionInfo', container.client_name);

    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: 'session_info_bh',
      Key: {
        'client_name': container.client_name
      },
      UpdateExpression: 'set createDateTime = :createDateTime, rest_token = :rest_token, rest_url = :rest_url, expire_time = :expire_time',
      ExpressionAttributeValues: {
        ':createDateTime': moment().valueOf(),
        ':rest_token': container.bh_auth.rest_token,
        ':rest_url': container.bh_auth.rest_url,
        ':expire_time': moment().add(3, 'hours').unix()
      },
      ReturnValues: 'UPDATED_NEW'
    };

    console.log('Updating the item...');
    docClient.update(params, function (err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        // console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      }
    });

    //  ->  Move to the next chain
    return resolve(container);
  });
}
