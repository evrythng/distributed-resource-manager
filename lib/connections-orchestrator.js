/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const logger = require('./logger');
const _ = require('lodash');
const connectionsRetriever = require('./connections-retriever');
const util = require('util');
const connectionHandler = require('./connection-handler');

let allConnections;
let connectionsHandledByThisHashring = [];

/**
 *
 * @param {Hashring} hashRingInstance
 * @param {{ id: String }[]} connections
 * @returns {{ id: String }[]}
 */
function filterConnectionsForThisHashring(hashRingInstance, connections) {
  return connections.filter(connection => {
    return hashRingInstance.allocatedToMe(connection.id);
  });
}

/**
 *
 * @param {{ id: String }} connection
 * @param {ConnectionHandler} connectionHandlerDefinition
 * @param {Logger} log
 * @returns {Promise.<void>}
 */
async function handleNewConnections(connection, connectionHandlerDefinition, log) {
  try {
    await connectionHandlerDefinition.handleConnection(connection);

    connectionsHandledByThisHashring.push(connection);
  } catch(err) {
    log.error(err, `There was an error when applying the 'handleConnection' to this connection: ${util.inspect(connection)}`);

    connectionHandlerDefinition.handleFailedConnection(connection);
  }
}

module.exports = {
  /**
   *
   * @param {Hashring} hashRingInstance
   * @param {{ id: String }[]} connections
   * @param {Boolean} cacheAllConnections
   * @returns {Promise<Array>}
   */
  async initialSetup(hashRingInstance, connections, cacheAllConnections = false) {
    const log = logger.getLogger();

    log.info('Setting up connections');

    const connectionHandlerDefinition = connectionHandler.getConnectionHandler();

    if (cacheAllConnections) {
      allConnections = cacheAllConnections;
    }

    const connectionsForThisHashring = filterConnectionsForThisHashring(hashRingInstance, connections);

    log.info(`There are ${connectionsForThisHashring.length} connections to be handled`);

    await Promise.all(connectionsForThisHashring.map(connection => handleNewConnections(connection, connectionHandlerDefinition, log)));
  },
  /**
   *
   * @param {Hashring} hashRingInstance
   */
  async rebalanceConnections(hashRingInstance) {
    const log = logger.getLogger();

    log.info('Rebalancing connections');

    let newConnectionsForThisHashring;

    if (!_.isEmpty(allConnections)) {
      newConnectionsForThisHashring = filterConnectionsForThisHashring(hashRingInstance, allConnections);
    } else {
      const connections = await connectionsRetriever.fetchConnections();

      newConnectionsForThisHashring = filterConnectionsForThisHashring(hashRingInstance, connections);
    }

    const connectionsToBeTerminated = connectionsHandledByThisHashring.filter(connection => {
      return !_.findWhere(newConnectionsForThisHashring, { id: connection.id });
    });
    const connectionsToBeAdded = newConnectionsForThisHashring.filter(connection => {
      return !_.findWhere(connectionsHandledByThisHashring, { id: connection.id });
    });

    log.debug(`There are ${connectionsToBeTerminated.length} connections to be terminated and ${connectionsToBeAdded.length} to be added`);

    const connectionHandlerDefinition = connectionHandler.getConnectionHandler();

    const newConnectionsPromises = connectionsToBeAdded.map(connection => handleNewConnections(connection, connectionHandlerDefinition, log));
    const oldConnectionsPromises = connectionsToBeTerminated.map(async connection => {
      _.remove(connectionsHandledByThisHashring, conn => conn.id === connection.id);

      try {
        await connectionHandlerDefinition.terminateConnection(connection);
      } catch(err) {
        log.error(err, `There was an error when applying the 'terminateConnection' to this connection: ${util.inspect(connection)}`);

        connectionHandlerDefinition.handleFailedTermination(connection);
      }
    })

    await Promise.all(newConnectionsPromises.concat(oldConnectionsPromises));
  },
  getConnectionsHandledByThisHashring() {
    return _.cloneDeep(connectionsHandledByThisHashring);
  },
  resetConnectionsHandledByThisHashring() {
    connectionsHandledByThisHashring = [];
  }
}