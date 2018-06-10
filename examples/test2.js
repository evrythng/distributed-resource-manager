const resourceManager = require('../lib/resource-manager');
const WebSocket = require('ws');
const bunyan = require('bunyan');

console.log('starting resource manager')
const loggerSettings = {
  level: 'debug',
  name: 'app',
};

const logger = bunyan.createLogger(loggerSettings);

const resources = {}
const resourceHandler = {
  handleResource(resource) {
    const ws = new WebSocket(resource.ws);

    console.log('handling new resource')
    resources[resource.id] = ws;
  },
  handleFailedResource(err) {
    console.error(err)
  },
  terminateResource(resource) {
    console.log('terminating resource');
    resources[resource.id].close();
  },
  handleFailedTermination(err) {
    console.error(err);
  }
}

resourceManager({
  ringpopOptions: {
    app: 'resource-manager-test',
    host: '127.0.0.1',
    port: 7775
  },
  ringpopHosts: ['127.0.0.1:7777'],
  logger,
  loggerChildConfig: {
    'resource-manager': '2'
  },
  fetchResourcesHttpOptions: {
    resourcesUrl: 'http://localhost:3000/resources'
  },
  resourceHandler,
  cacheAllResources: true,
}).then(({stop}) => {
  console.log('resource manager started');

}).catch(err => {
  console.error(err)
})