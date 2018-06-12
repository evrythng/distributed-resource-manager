/* eslint import/no-extraneous-dependencies: 0 */
/* eslint require-jsdoc: 0 */

const resourceManager = require('../lib/resource-manager');
const express = require('express');
const WebSocket = require('ws');

const app = express();
const bunyan = require('bunyan');

const wss = new WebSocket.Server({ port: 8080 });

let totalConnections = 0;

wss.on('connection', (ws) => {
  totalConnections += 1;

  console.log(`total connections: ${totalConnections}`);

  ws.on('close', () => {
    totalConnections -= 1;

    console.log(`total connections: ${totalConnections}`);
  });
});

const resources = [
  {
    id: '1',
    ws: 'ws://localhost:8080',
  },
  {
    id: '2',
    ws: 'ws://localhost:8080',
  },
  {
    id: '3',
    ws: 'ws://localhost:8080',
  },
  {
    id: '4',
    ws: 'ws://localhost:8080',
  },
  {
    id: '5',
    ws: 'ws://localhost:8080',
  },
  {
    id: '6',
    ws: 'ws://localhost:8080',
  },
];

app.get('/resources', (req, res) => res.json({
  data: resources,
}));

function start() {
  const serverReady = () => new Promise((resolve) => {
    app.listen(3000, () => {
      console.log('Example app listening on port 3000!');
      resolve();
    });
  });
  const wssReady = () => new Promise((resolve) => {
    wss.on('listening', () => {
      console.log('web socket server listening');
      resolve();
    });
  });

  return Promise.all([serverReady(), wssReady()]);
}

start().then(() => {
  console.log('starting resource manager');
  const loggerSettings = {
    level: 'debug',
    name: 'app',
  };

  const logger = bunyan.createLogger(loggerSettings);

  const resourceConnections = {};
  const resourceHandler = {
    handleResource(resource) {
      const ws = new WebSocket(resource.ws);

      resourceConnections[resource.id] = ws;

      console.log('handling resource');
    },
    handleFailedResource(err) {
      console.error(err);
    },
    terminateResource(resource) {
      resourceConnections[resource.id].close();

      console.log('terminating resource');
    },
    handleFailedTermination(err) {
      console.error(err);
    },
  };

  return resourceManager({
    ringpopOptions: {
      app: 'resource-manager-test',
      host: '127.0.0.1',
      port: 7777,
    },
    ringpopHosts: ['127.0.0.1:7777'],
    logger,
    loggerChildConfig: {
      'resource-manager': '1',
    },
    fetchResourcesHttpOptions: {
      resourcesUrl: 'http://localhost:3000/resources',
    },
    resourceHandler,
  });
}).then(() => {
  console.log('resource manager started');
}).catch((err) => {
  console.log('There was an error');
  console.error(err);
});
