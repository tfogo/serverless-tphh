const mongodb = require('mongodb')

let cachedDb = null

module.exports.hello = async function(event, context, callback) {
  // This is a specific step for NodeJS. It allows Lambda to freeze the container
  // even when there are events in the event loop. So Lambda can freeze the
  // container even with an open db connection.
  context.callbackWaitsForEmptyEventLoop = false
  
  let db = await connectToDatabase(process.env.MONGODB_URI)
  
  let status = await db.admin().serverStatus()
  callback(null, {statusCode: 200, body: JSON.stringify({connections: status.connections}) })
};

function connectToDatabase(uri) {
  if (cachedDb && cachedDb.serverConfig.isConnected()) {
    console.log('=> using cached database instance');
    return Promise.resolve(cachedDb);
   }

  return mongodb.MongoClient.connect(uri)
    .then(client => { 
     cachedDb = client.db('serverless')
     return cachedDb
    })
}