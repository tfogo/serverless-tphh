const mongodb = require('mongodb')

let cachedDb = null

module.exports.hello = async function(event, context, callback) {
  
  context.callbackWaitsForEmptyEventLoop = false
  
  let n = event.queryStringParameters.n
  console.log(n)
  
  let db = await connectToDatabase(process.env.MONGODB_URI)

  let arr = []
  for (i = 0; i < n; i++) {
    arr.push(db.admin().serverStatus())
  } 
  console.log(arr)
  let statuses = await Promise.all(arr)
  let connections = statuses.map(e => e.connections)
  callback(null, {statusCode: 200, body: JSON.stringify({connections: connections}) })
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