[![Build Status](https://travis-ci.org/evrythng/distributed-resource-manager.svg?branch=master)](https://travis-ci.org/evrythng/distributed-resource-manager)
[![Coverage Status](https://coveralls.io/repos/github/evrythng/distributed-resource-manager/badge.svg?branch=master)](https://coveralls.io/github/evrythng/distributed-resource-manager?branch=master)

# distributed-resource-manager

The distributed resource manager provides a way of managing a set of resources across multiple nodes. Resources could be websocket connections to other services, urls to be called when an event occurs or any set of things that must be handled in a distributed manner.

This library abstracts away the problem of the allocation and distribution of these resources so users can focus on the core business logic of their application. They don’t need to worry about maintaining the resource in the cloud when new nodes are added to the system or if one of them goes down. 

## When would you use it?

The resource manager is useful when the following are true:

1. You need to manage a set of resources that connect to a third-party service in some way e.g. websocket connection, http polling, redis pub/sub
2. These resources need to be handled in a distributed system
3. You need to ensure that if a node handling a resource goes down that it is then reallocated somewhere else
 
At [EVRYTHNG](http://evrythng.com/) we use a version of this library for the following:

* Maintaining permanent websocket connections to third party clouds. The users of the customers of the EVRYTHNG platform can have their data synchronised with other clouds. When this happens we set up a websocket connection to the other cloud and the distributed resource manager library takes care of keeping that websocket connection alive in case of node failure or some other error.
* Allocating webhook resources to a particular node. In the EVRYTHNG platform internal components can subscribe to events in the platform by specifying a url. This url is then called when the event occurs. The distributed resource manager handles the allocation of these webhooks to specific nodes which ensures a url is only ever called once for a single event.

The library depends on [ringpop](https://github.com/uber-node/ringpop-node) to shard resources amongst a set of nodes and to forward new resources to the appropriate node.  

## How it works

When the distributed resource manager is started it will go through the following steps:

1. Join a ringpop hashring
2. Once it has joined the hashring it will fetch a set of resources (by default this is via http)
3. For each resource it will check if the resource should be assigned to itself. If not the resource will be forward to another instance of the resource manager that should handle it
4. It will call a user-supplied function for each resource it should be handling. The user-supplied function provides the business logic for the application (e.g. opening a websocket connection etc.)
5. If any other instances of the distributed resource manager are started the existing resources will be rebalanced amongst all instances. If any instances are removed the resources will also be rebalanced.

## Requirements

* Requires Node version >= *v8.9*

## Install

```
npm i distributed-resource-manager
```

## Example

```js
const loggerSettings = {
  level: 'debug',
  name: 'app',
};

const logger = bunyan.createLogger(loggerSettings);

const resourceConnections = {}
const resourceHandler = {
  handleResource(resource) {
    const ws = new WebSocket(resource.ws);

    resourceConnections[resource.id] = ws;

    console.log('handling resource');
  },
  handleFailedResource(err) {
    console.error(err)
  },
  terminateResource(resource) {
    resourceConnections[resource.id].close();

    console.log('terminating resource');
  },
  handleFailedTermination(err) {
    console.error(err);
  }
}

resourceManager({
  ringpopOptions: {
    app: 'resource-manager-test',
    host: '127.0.0.1',
    port: 7777
  },
  ringpopHosts: ['127.0.0.1:7777'],
  logger,
  loggerChildConfig: {
    'resource-manager': '1'
  },
  fetchResourcesHttpOptions: {
    resourcesUrl: 'http://localhost:3000/resources'
  },
  resourceHandler
}).then(({allocateResource, deallocateResource, stop}) => {
  console.log('resource manager started');
})
```

See [here](examples) for a more detailed example.

## API

* [`distributedResourceManager()`](#distributedresourcemanagerconfig)
* [`instance.allocateResource(resource)`](#instanceallocateresourceresource)
* [`instance.deallocateResource(resource)`](#instancedeallocateresourceresource)
* [`instance.stop()`](#stop)

### `distributedResourceManager(config)`

Starts the distributed resource manager and returns a Promise.

Config options:

* `ringpopOptions.app`: The title of your application. It is used to protect your application’s ring from cross-pollinating with another application’s ring (string - **required**)
* `ringpopOptions.host`: The hostname or ip address of the node (string - **required**)
* `ringpopOptions.port`: The port the app will be running on (integer - **required**)
* `ringpopHosts`: An array of addresses for other nodes in the application ring (array of strings - **required**)
* `logger`: An instance of the [Bunyan](https://github.com/trentm/node-bunyan) logger
* `loggerChildConfig`: The [child config](https://github.com/trentm/node-bunyan#logchild) for your bunyan logger (object)
* `fetchResourcesHttpOptions.resourcesUrl`: The url to fetch resources from (string - this is **required** if `resourcesRetrieverPlugin` is not specified)
* `fetchResourcesHttpOptions.nodeFetchOptions`: Options for [node-fetch](https://github.com/bitinn/node-fetch#fetch-options) for making the request to `fetchResourcesHttpOptions.resourcesUrl` (object)
* `fetchResourcesHttpOptions.pollForNewResources`: Whether the resource manager should poll `fetchResourcesHttpOptions.resourcesUrl` for new resources (boolean - default = `false`)
* `fetchResourcesHttpOptions.howOftenToPoll`: How often the resource manager should poll for new resources in milliseconds (integer - default = `60000`)
* `cacheAllResources`: If this is `true` then all resources will be stored in memory when first fetched. This means if the resources are rebalanced amongst the hash ring the resource manager will not re-fetch the resources (boolean - default = `false`)
* `resourceHandler`: Methods for handling new resource allocation and termination. This is [described more below](#resourcehandler) (object - **required**)
* `resourcesRetrieverPlugin`: A plugin for retrieving resources. This is [described more below](#plugins) (object)
* `resourcesRetrieverConfig`: Configuration for the `resourcesRetrieverPlugin` (object)
* `maxLengthOfTimeToRetryResourceFetching`: During resource balancing the maximum length of time in milliseconds the resource manager will attempt to retry fetching resources if it keeps getting errors. If by this time the resource manager has been unable to fetch the resources then it will exit (integer - default = `60000`)

### `instance.allocateResource(resource)`

Allocates a resource to the hashring and returns a Promise. `resource` must be an object that contains an `id` field. Once the resource has been allocated then `resourceHandler.handleResource` will be called.

If the resource needs to be allocated to another node in the hashring the manager will proxy this allocation to the correct node.  

This api method should really only be used by a plugin.

### `instance.deallocateResource(resource)`

Deallocates a resource from the hashring and returns a Promise. `resource` must be an object that contains an `id` field. Once the resource has been deallocated then `resourceHandler.terminateResource` will be called.

If the resource deallocation needs to be handled by another node in the hashring the manager will proxy this deallocation to the correct node. 

This api method should really only be used by a plugin.

### `stop()`

Stops the distributed resource manager by closing ringpop and calling `resourcesRetrieverPlugin.tearDown`. Returns a Promise when shut down is complete.

## `resourceHandler`

When starting an instance of the distributed resource manager a `resourceHandler` must be provided as part of the config. It must implement the following interface:

```
Resource {
    id: String
}

ResourceHandler {
    handleResource(resource:Resource): Promise;
    handleFailedResource(resource:Resource): Void;
    terminateResource(resource:Resource): Promise;
    handleFailedTermination(resource:Resource): Void;
}
```

Each method will be called with the `resource` as an argument which must contain an `id` field.

Every method must be implemented although `handleFailedResource` and `handleFailedTermination` can be just empty functions as, depending on your use case, it might not be important to specify any logic for these.

### `handleResource(resource)`

This will be called when a new resource has been allocated to the hashring. It can return a Promise. 

It is here where the logic for handling a resource should be defined such as setting up a websocket connection or polling an http endpoint. For example, [in this test script](examples/test.js#L89) when `handleResource` is called it will set up a connection to a websocket server.

### `handleFailedResource(resource)`

This will be called when there was an error calling `handleResource()`. Depending on your use case it might not be important to put any logic here.

If the resource needs to be handled again the [`instance.allocateResource(resource)`](#instanceallocateresourceresource) method can be used.

### `terminateResource(resource)`

This will be called when a resource has been allocated to another node. It can return a Promise.

It is here where the logic for tearing down a resource should be defined such as closing a websocket connection or stopping the polling of an http endpoint. For example, [in this test script](examples/test.js) when `terminateResource` is called it will close the resource's connection to a websocket server. 

### `handleFailedTermination(resource)`

This will be called when there was an error calling `terminateResource()`. Depending on your use case it might not be important to put any logic here.

Please note that if the manager failed to terminate the resource it will still remove it from its hashring so it will not be allocated to any node. If you need to ensure the resource has been terminated the [`instance.deallocateResource(resource)`](#instancedeallocateresourceresource) method can be used.

## The default http plugin

By default the distributed resource manager will fetch resources from the http endpoint specified in the config: `fetchResourcesHttpOptions.resourcesUrl` using an [http plugin](lib/http-resources-plugin.js). It expects to receive a JSON response with the following data structure:

```json
{
  "data": [
    {
      "id": "1"
    },
    {
      "id": "2"
    }
  ]
}
```

Each object in `data` must contain an `id` field which must be a unique string in the data set. You are free to add additional fields to the objects along with the `id` field. 

Each of these resources will then be allocated to the hashring and the `resourceHandler.handleResource` method will be called for each one.

## Plugins

If you want to fetch the resources through a method other than http (or you want an alternative http implementation) then you can write a plugin. A plugin must implement the following interface:

```
ResourcesRetrieverPlugin {
  setup(resourcesRetrieverConfig: object, resourceManagerApi: DistributedResourceManager): Promise;
  fetchResources(): Promise<Array<Resource>>;
  tearDown(): Promise;
}
```

Every method must be implemented. See the [http plugin](lib/http-resources-plugin.js) for a reference implementation.

### `setup(resourcesRetrieverConfig, resourceManagerApi)`

This is called to setup your plugin and expects a Promise to be returned. For example, you may want to create a database connection here or start polling a queue. `setup` is called with the following arguments:

* `resourcesRetrieverConfig` - config for the plugin that is specified when starting the distributed resource manager (the `resourcesRetrieverConfig` option - see above)
* `resourceManagerApi` - the instance of the distributed resource manager created when the manager is started 

You can use the `resourceManagerApi` to allocate and deallocate resources as necessary. For example, in your setup you start polling a database for new resources to manage. When the polling finds a new resource you can allocate it with `resourceManagerApi.handleResource`.

### `fetchResources`

This will be called when the resource manager first starts and also when resources are rebalanced unless the `cacheAllResources` config option is set to `true`.

This method should return a Promise that resolves to a set of resources. This should be an array of objects each of which contain at least an `id` field which must be a unique string in the data set.

The resource manager will allocate these resources to the hashring and call `resourceHandler.handleResource` for each one.

### `tearDown()`

This will be called when the distributed resource manager is shutting down. For example, you may want to close a database connection or stop queue polling.

## Running the tests

`npm test` to run the linting and tests.
