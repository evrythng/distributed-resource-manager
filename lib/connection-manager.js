/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const logger = require('./logger');
const hashring = require('./hash-ring');
const httpConnectionsPlugin = require('./http-connections-plugin');
const connectionsOrchestrator = require('./connections-orchestrator');
const connectionsRetriever = require('./connections-retriever');
const connectionHandler = require('./connection-handler');

/**
 * @typedef {Object} ConnectionManager
 * @property {Function} start
 * @property {Function} allocateConnection
 * @property {Function} deallocateConnection
 * @property {Function} stop
 *
 */
module.exports = {
  /**
   *
   * @param {Object} config
   * @param {Object} config.swimHashRingOptions
   * @param {Logger} config.logger
   * @param {Object} config.loggerChildConfig
   * @param {Object} config.fetchConnectionsOptions
   * @param {String} config.fetchConnectionsOptions.connectionsUrl
   * @param {Object} config.fetchConnectionsOptions.nodeFetchOptions
   * @param {Boolean} config.cacheAllConnections
   * @param {ConnectionHandler} config.connectionHandler
   * @param {ConnectionsRetrieverPlugin} config.connectionsRetriever
   * @param {Object} config.connectionsRetrieverConfig
   */
  async start(config) {
    const log = logger.setupLogger(config.logger, config.loggerChildConfig);

    log.info('Setting up connection manager');

    connectionHandler.setupConnectionHandler(config.connectionHandler);

    const hashRingInstance = await hashring.setupHashring(config.swimHashRingOptions);

    let connectionsRetrieverPlugin;

    if (config.connectionsRetriever) {
      connectionsRetrieverPlugin = config.connectionsRetriever;
    } else {
      connectionsRetrieverPlugin = httpConnectionsPlugin;
    }

    try {
      const connectionsRetrieverConfig = config.connectionsRetrieverConfig ? config.connectionsRetrieverConfig : config.fetchConnectionsOptions;

      await connectionsRetriever.setupConnectionsRetriever(connectionsRetrieverPlugin, connectionsRetrieverConfig);
      const connections = await connectionsRetriever.fetchConnections();

      await connectionsOrchestrator.initialSetup(hashRingInstance, connections, config.cacheAllConnections);

      hashring.setupEventListeners();

      log.info('Connection manager has finished setup');
    } catch(err) {
      hashRingInstance.close();

      throw err;
    }
  },
  // allocateConnection() {},
  // deallocateConnection() {},
  // stop()
}