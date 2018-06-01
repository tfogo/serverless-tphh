# Serverless TPHH

## Contents

- What is serverless?
- How does FaaS work?
- What are the benefits and drawbacks of FaaS?
- What tools are available?
- What is relevant to us?

Note, to follow along with the coding parts of this workshop, download the [serverless CLI](https://serverless.com/):

```
npm i -g serverless
```

Make sure you have your AWS credentials set up correctly so they can be used by the serverless CLI: https://serverless.com/framework/docs/providers/aws/guide/credentials/

## Reading

- https://martinfowler.com/articles/serverless.html#benefits
- https://blog.symphonia.io/learning-lambda-1f25af64161c
- https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
- https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs

## What is serverless?

Serverless can be used to describe both BaaS systems such as Firebase or Parse, or FaaS systems such as AWS Lambda or Azure Functions. Functions run in stateless containers that are event-triggered, ephemeral (may only last for one invocation), and are (often) fully managed by a third party. FaaS is the aspect of serverless that has gained the most hype over the last couple of years. AWS Lambda is the leading FaaS provider.

![](https://media.giphy.com/media/ZIyPz7yO97cIg/giphy.gif)

There is a popular framework called _serverless_ that makes developing and deploying cloud functions easier. This is separate from _serverless the concept_.

## How does FaaS work?

As an example, let's look at the lifecycle of an AWS Lambda function. We start by writing and uploading a function to Lambda. This is a regular function but it needs to conform to a specific type signature. You don't need any special libraries to run a Lambda function, though there are AWS libraries available to talk to other AWS resources from your function. 

A Lambda function is typically triggered by some sort of cloud event - an HTTP request, an upload to S3, a new entry in DynamoDB, etc. Lambda runs our function by first creating a container for it, on demand, whenever it needs to execute the function. Where and how that container is instantiated is completely opaque to us. We know it’s somewhere in the AWS region we configured but that’s about all. The point here is that we never provisioned, allocated or configured a server, or host instance, for our code to run on, and nor can we. This is entirely AWS’ responsibility and decision.

Once the container is running Lambda then launches a runtime system - NodeJS, Go, Java, or others. The initial code run by the runtime is all Amazon’s and also part of the Lambda runtime — we still haven’t reached our logic yet.

Once the runtime is ready the Lambda platform calls our function, passing it an event. 

And finally our code is run! AWS Lambda functions can be run synchronously or asynchronously. In the former case a value is returned from the function, for example an HTTP response to be passed back to a client. In the latter, no value is returned but there may be side-effects such as updating a database entry or adding a message to a queue.

The container that was brought up for this function is ephemeral. It could be torn down immediately after the function executes. In general, containers will remain up for a few minutes, waiting for another event to trigger the function. If a new event comes in, Lambda will be able to run the function must faster because it won't have to bring up a new container. After invocation containers are _frozen_ for approximately 5 minutes, though there are no guarantees how long a container will be frozen. If a new event triggers a function and there's an available frozen container, the container will be _thawed_ and reused. 

Let's read a bit more about how FaaS works here: https://martinfowler.com/articles/serverless.html#unpacking-faas

## What are the benefits and drawbacks of FaaS?

https://martinfowler.com/articles/serverless.html#benefits

> Note: Downstream databases and non-FaaS components will have to be reconsidered in light of a possibly significant increase in their load.

Benefit not mentioned: Cloud provider free tiers

Drawback not directly mentioned: Connection pooling is inferior to long-living compute instances.

## Quick dive into Lambda using the AWS CLI

Let's deploy a simple "Hello World" application using the AWS CLI. A Lambda function just needs to include a handler function that we say should be called by Lambda. The signature of this function for the supported programming languages can be found in the AWS docs. The signature for JavaScript can be found here: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html

So let's use a simple handler function that returns "Hello World":

```js
module.exports.handler = (event, context, callback) => {
  callback(null, "Hello World");
};
```

Code for Lambda functions are zipped and stored in S3. Let's zip this code and create a new Lambda:

```
zip 1_hello_world.zip 1_hello_world.js

aws lambda create-function --function-name 1_hello_world --runtime nodejs8.10 --role arn:aws:iam::299928122988:role/lambda_basic_execution --handler 1_hello_world.handler --zip-file fileb://1_hello_world.zip
```

Now let's go to the AWS Console and take a look at what was created. Let's look at a few things:

- Our code has been uploaded and is editable in the console. This is the case for JavaScript and Python. When deploying compiled languages, you deploy the compiled artifact and editing code isn't available.
- Each Lambda function must be associated with an IAM role which defines which resources it has access to.
- There are triggers and resources. You can trigger lambdas based on many types of cloud events. The most common use case is putting an HTTP server in front of a lambda using API Gateway. Processing events from a queue using Kinesis or processing files using S3 are other popular use cases.
- You can tune the memory and timeout of a function.
- You can reserve concurrency. By default, AWS Lambda limits the total concurrent executions across all functions within a given region to 1000. By reserving concurrency for a function, you are a) setting up a concurrency limit for that function so its impact on other functions are limited, and b) reducing the concurrency pool available to other functions so that amount of concurrency will always be available to that function. To see more about why you might want to reserve concurrency, see here: https://docs.aws.amazon.com/lambda/latest/dg/concurrent-executions.html#per-function-concurrency
- We can test our function by clicking "Test" and passing an example event.
- Logs to stdout/stderr are sent to CloudWatch
- If synchronous functions error, the error is propagated back up to the client. If asynchronous functions error, the function is retried twice then the event is discarded. You can send a failed event to a Dead Letter Queue (such as SQS or SNS) to be dealt with. Read more about error handling here: https://blog.symphonia.io/learning-lambda-part-7-40f47cb3cc35
- You can monitor invocations and other stats. 

You'll notice that setting up lambda functions takes a lot of configuration. Maintaining API Gateway and IAM role configurations in code is particularly painful. This involves using CloudFormation, which honestly isn't the easiest experience. AWS have released SAM to help with this, but the tooling still isn't fantastic.

### Using libraries

You can use packages from npm by just having the `node_modules` directory zipped up with your code. You can make use of native libraries by including them with your code, but they must be compiled against Amazon Linux (https://aws.amazon.com/blogs/compute/nodejs-packages-in-lambda/).

### What tools are available?

- [AWS SAM (Serverless Application Model)](https://github.com/awslabs/aws-sam-cli). A simplified CloudFormation config language for serverless applications. You can use the SAM CLI to generate boilerplate SAM configs.
- [Serverless](https://serverless.com/). A YAML config language and CLI for easily deploying functions across different cloud vendors. Is more simple than SAM and is very popular.
- There are tools and frameworks for specific languages. For example, [Zappa](https://github.com/Miserlou/Zappa) for Python and [Claudia.js](https://github.com/claudiajs/claudia) for NodeJS.
- There are also tools for running your own FaaS systems on your own cloud (Think CloudFoundry). A lot of these frameworks are built on Kubernetes. Examples include: [Apache OpenWhisk](https://openwhisk.apache.org/), [Fission](https://fission.io/), and [OpenFaaS](https://github.com/openfaas/faas)

### The Serverless CLI: A better experience

You can use the serverless CLI to create a new lambda function from a template, and easily deploy lambda functions. The config is stored in `serverless.yml`. Let's take a look at an example:

```yaml
service: 2_hello_world

provider:
  name: aws
  runtime: nodejs8.10

functions:
  hello:
    handler: handler.hello
```

To deploy this function, run:

```
serverless deploy
```

This created the CloudFormation configuration necessary and deploys it to AWS. You can invoke the function on Lambda by running:

```
serverless invoke -f hello
```

Or invoke locally on an emulation of Lambda by running:

```
serverless invoke local -f hello
```

You can package together and deploy several functions at once in one package. For simplicity's sake we'll just look at one function at a time.

### Using API Gateway

Let's look at a new example where we put an API Gateway in front of Lambda:

```yaml
service: hello-world-api-3

provider:
  name: aws
  runtime: nodejs8.10

functions:
  hello:
    handler: handler.hello
    events:
      - http: GET hello
```

To respond to an HTTP request, we have to send back an HTTP response object:

```js
module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ "message": "Hello World!" })
  };
    
  callback(null, response);
};
```

You will receive a URL which you can curl.

### Instance reuse

Typically Lambda won’t perform a cold start for every event that triggers our function. This is because once our function has finished executing, Lambda can freeze the combination of container, runtime and function instance and keep it around a little while in case another event happens soon. If an event does happen soon then Lambda will simply thaw the container, and call it with the event.

Let's see an example of this container reuse:

```js
const uuid = require('uuid/v1')

const id = uuid()

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ "id": id })
  };
    
  callback(null, response);
};
```

Invoking this function twice in quick succession will return the same UUID because the state is maintained. E.g.

```
$ curl https://ysjtndsj0h.execute-api.us-east-1.amazonaws.com/dev/hello
{"id":"97b43910-65ca-11e8-8775-29c1872d2c50"}

$ curl https://ysjtndsj0h.execute-api.us-east-1.amazonaws.com/dev/hello
{"id":"97b43910-65ca-11e8-8775-29c1872d2c50"}
```


### Parallel Instances

A cold start is necessary whenever there is no existing container available to process an event. This situation happens at the following times:

- When a Lambda function’s code or configuration changes (including when the first version of a function is deployed)
- When all previous containers have been expired due to inactivity
- When all previous containers have been ‘reaped’ due to age
- When Lambda needs to scale out because all current containers for the required function are already processing events.

Let's look at an example of cold starting new containers by scaling horizontally. Concurrently running functions will run on different containers so will have different UUIDs. We add a timeout to the function to allow us to easily run multiple functions concurrently:

```js
const uuid = require('uuid/v1')

const id = uuid()

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ "id": id })
  };
    
  setTimeout(() => callback(null, response), 6000);
};
```

Note that we have to increase Lambda's timeout since the default timeout is 6 seconds:

```yaml
service: uuid-5

provider:
  name: aws
  runtime: nodejs8.10
  timeout: 10

functions:
  hello:
    handler: handler.hello
    events:
      - http: GET hello
```

Curling the URL multiple times in parallel will show different UUIDs:

```
curl https://obk7vksjac.execute-api.us-east-1.amazonaws.com/dev/hello
{"id":"81102b00-65d5-11e8-92a2-0d89cb603845"}

curl https://obk7vksjac.execute-api.us-east-1.amazonaws.com/dev/hello
{"id":"75f41510-65d5-11e8-9a58-2575a96d25c5"}
```

### Connection Pooling: Techniques and Limitations

Let's start by looking at a Naïve example which creates and closes a connection for every function invocation:

```js
const mongodb = require('mongodb')

module.exports.hello = async function(event, context, callback) {
  let client = await mongodb.MongoClient.connect(process.env.MONGODB_URI)
  let db = await client.db("serverless")
  let status = await db.admin().serverStatus()
  client.close()
  callback(null, {statusCode: 200, body: JSON.stringify({connections: status.connections}) })
};
```

We can add environment variables to our Lambda function using this serverless configuration:

```yaml
service: mongo-6

provider:
  name: aws
  runtime: nodejs8.10
  timeout: 10

functions:
  hello:
    handler: handler.hello
    events:
      - http: GET hello
    environment:
      MONGODB_URI: ${env:SLS_MONGO_URI}
```

Invoking this function will create and close a connection for each invocation. We'll see the total number of created connections increasing (but the total number of current connections will remain the same):

```
curl https://grsirgf3cf.execute-api.us-east-1.amazonaws.com/dev/hello
{"connections":{"current":8,"available":19992,"totalCreated":208}}

curl https://grsirgf3cf.execute-api.us-east-1.amazonaws.com/dev/hello
{"connections":{"current":8,"available":19992,"totalCreated":209}}
```

This is inefficient and we want to pool connections. We can declare a variable outside the function handler and that can be accessed between invocations - as long as the container has been frozen and is able to be reused:

```js
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
```

This technique comes from this blog post from MongoDB on using Lambda with Atlas. It is highly recommended reading: https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs

If we invoke these functions, we'll see that the total connections created don't increase because connections are being reused:

```
curl https://wv4voskhr7.execute-api.us-east-1.amazonaws.com/dev/hello
{"connections":{"current":6,"available":19994,"totalCreated":241}}

curl https://wv4voskhr7.execute-api.us-east-1.amazonaws.com/dev/hello
{"connections":{"current":6,"available":19994,"totalCreated":241}}
```

#### Limitations

Every new container will create a new connection pool. So concurrent requests will not be able to make use of connection pooling. Also, if functions are invoked infrequently, they will experience cold starts and will have to create a new connection on each invocation.

This is worse than having a dedicated instance, which is able to maintain long living connections, and concurrent requests can draw from the same connection pool.

