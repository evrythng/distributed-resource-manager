/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const Ringpop = require('ringpop');
const logger = require('./logger');
const resourcesOrchestrator = require('./resources-orchestrator');
const retry = require('retry');
const resourcesRetriever = require('./resources-retriever');
const TChannel = require('tchannel');
const TChannelJSON = require('tchannel/as/json');

let ringpopInstance;
let tchannelJSON;

/**
 *
 * @param {retry} operation
 * @param {Integer} currentAttempt
 * @returns {Promise.<void>}
 */
async function attemptRebalancing(operation, currentAttempt) {
  const log = logger.getLogger();

  try {
    await resourcesOrchestrator.rebalanceResources(ringpopInstance);
  } catch (err) {
    if (operation.retry(err)) {
      log.error(err);

      log.info('Retrying rebalancing of resources');
      return;
    }

    log.error(operation.mainError(), `After ${currentAttempt} attempts rebalancing has failed. Exiting...`);

    ringpopInstance.destroy();

    await resourcesRetriever.tearDown();
  }
}

/**
 *
 * @param {Integer} maxLengthOfTimeToRetryResourceFetching
 */
function rebalanceResourcesWithRetry(maxLengthOfTimeToRetryResourceFetching = 60000) {
  const operation = retry.operation({
    forever: true,
    maxRetryTime: maxLengthOfTimeToRetryResourceFetching,
  });

  operation.attempt(currentAttempt => attemptRebalancing(operation, currentAttempt));
}

/**
 *
 * @param {TChannel} subChannel
 */
function setupTChannelClient(subChannel) {
  tchannelJSON = new TChannelJSON({
    channel: subChannel,
  });
}

/**
 *
 * @param {{id: string}} resource
 * @param {string} node
 * @param {string} method
 * @returns {Promise}
 */
function makeRequestToRing(resource, node, method) {
  return new Promise((resolve, reject) => {
    tchannelJSON.request({
      serviceName: 'ringpop',
      host: node,
      hasNoParent: true,
      headers: {
        cn: 'ringpop',
      },
      retryLimit: ringpopInstance.config.get('tchannelRetryLimit'),
      timeout: 5000,
    }).send(
      '/proxy/req',
      {
        ringpopChecksum: ringpopInstance.ring.checksum,
        ringpopKeys: [resource.id],
        method,
      },
      resource,
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      },
    );
  });
}

module.exports = {
  /**
   *
   * @param {Object} ringpopOptions
   * @param {Array<string>} ringpopHosts
   * @returns {Promise}
   */
  setupHashring(ringpopOptions, ringpopHosts) {
    const log = logger.getLogger();

    const { app, host, port } = ringpopOptions;
    const tchannel = new TChannel();
    const subChannel = tchannel.makeSubChannel({
      serviceName: 'ringpop',
      trace: false,
    });

    log.debug({ ringpopOptions }, 'Connecting to hash ring');

    ringpopInstance = new Ringpop({
      app,
      hostPort: `${host}:${port}`,
      channel: subChannel,
    });

    ringpopInstance.setupChannel();

    return new Promise((resolve, reject) => {
      ringpopInstance.once('ready', () => {
        log.info('Hash ring ready');

        setupTChannelClient(subChannel);
        resolve(ringpopInstance);
      });

      /**
       *
       * @param {Error} err
       */
      const bootstrapHandler = (err) => {
        if (err) {
          ringpopInstance.destroy();
          reject(err);
        }
      };

      tchannel.listen(port, host, (err) => {
        if (err) {
          ringpopInstance.destroy();
          reject(err);
          return;
        }

        ringpopInstance.bootstrap(ringpopHosts, bootstrapHandler);
      });
    });
  },
  /**
   *
   * @param {Integer} maxLengthOfTimeToRetryResourceFetching
   */
  setupEventListeners(maxLengthOfTimeToRetryResourceFetching) {
    const log = logger.getLogger();

    ringpopInstance.on('ringChanged', (ringChangedEvent) => {
      log.info({ added: ringChangedEvent.added, removed: ringChangedEvent.removed }, 'Hash ring changed');

      rebalanceResourcesWithRetry(maxLengthOfTimeToRetryResourceFetching);
    });

    ringpopInstance.on('request', (req, res, headers) => {
      log.debug({ headers }, 'Ringpop received request');

      let allData = [];

      req.on('data', (data) => {
        allData = allData.concat(data);
      });

      req.on('end', () => {
        const resource = JSON.parse(allData);

        if (headers.method === 'POST') {
          resourcesOrchestrator.handleNewResources(resource);
        } else {
          resourcesOrchestrator.handleResourceTermination(resource);
        }

        res.end();
      });
    });
  },
  /**
   *
   * @param {{id: string}} resource
   * @returns {Promise}
   */
  allocateResource(resource) {
    const log = logger.getLogger();

    const node = ringpopInstance.lookup(resource.id);

    if (node === ringpopInstance.whoami()) {
      log.debug({ resource }, 'Allocating new resource');

      return resourcesOrchestrator.handleNewResources(resource);
    }

    log.debug({ resource }, 'Resource forwarded to another node');

    // ordinarily we'd use `ringpopInstance.handleOrProxy()` but this method
    // requires a node http `req` and `res`
    // object as arguments which we do not have in this case
    // instead we need to make a manual request to the node using our own TChannel client
    return makeRequestToRing(resource, node, 'POST');
  },
  /**
   *
   * @param {{id: string}} resource
   * @returns {Promise}
   */
  deallocateResource(resource) {
    const log = logger.getLogger();

    const node = ringpopInstance.lookup(resource.id);

    if (node === ringpopInstance.whoami()) {
      log.debug({ resource }, 'Deallocating resource');

      return resourcesOrchestrator.handleResourceTermination(resource);
    }

    log.debug({ resource }, 'Deallocation of resource forwarded to another node');

    // ordinarily we'd use `ringpopInstance.handleOrProxy()`
    // but this method requires a node http `req` and `res`
    // objects as arguments which we do not have in this case
    // instead we need to make a manual request to the node using our own TChannel client
    return makeRequestToRing(resource, node, 'DELETE');
  },
  /**
   *
   */
  stop() {
    ringpopInstance.destroy();
  },
};
