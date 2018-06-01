const uuid = require('uuid/v1')

const id = uuid()

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ "id": id })
  };
    
  callback(null, response);
};