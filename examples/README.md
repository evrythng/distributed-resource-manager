This folder contains two files: `test.js` and `test2.js`.

Running `test.js` will start an express api and websocket server as well as starting the distributed resource manager. The manager will fetch a set of resources from the express api and then allocate them to the hashring. In this test the `resourceHandler` is defined like this:
 
 ```js
const resourceConnections {};

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
```
 
When the resources are allocated the manager will call the `resourceHandler.handleResource` method provided above.

Running `test2.js` will start another instance of the resource manager which will connect to the same hashring defined in `test.js`. This will cause some of the resources in `test` to be reallocated to `test2`. When resources are reallocated the manager will call the `resourceHandler.terminateResource` method which in this example will terminate the websocket connection.