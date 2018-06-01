const mongodb = require('mongodb')

module.exports.hello = async function(event, context, callback) {
  let client = await mongodb.MongoClient.connect(process.env.MONGODB_URI)
  let db = await client.db("serverless")
  let status = await db.admin().serverStatus()
  client.close()
  callback(null, {statusCode: 200, body: JSON.stringify({connections: status.connections}) })
};