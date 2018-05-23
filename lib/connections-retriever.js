/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

/**
 * @typedef {Object} ConnectionsRetrieverPlugin
 * @property {setup} setup
 * @property {Function} fetchConnections
 *
 */


let connectionsRetriever;

module.exports = {
  /**
   *
   * @param {ConnectionsRetrieverPlugin} connectionsRetrieverPlugin
   * @param {Object} connectionsRetrieverConfig
   * @returns {Promise}
   */
  setupConnectionsRetriever(connectionsRetrieverPlugin, connectionsRetrieverConfig) {
    connectionsRetriever = connectionsRetrieverPlugin;

    return connectionsRetriever.setup(connectionsRetrieverConfig);
  },
  /**
   *
   * @returns {ConnectionsRetrieverPlugin}
   */
  getConnectionsRetriever() {
    return connectionsRetriever;
  },
  /**
   *
   * @returns {Promise}
   */
  fetchConnections() {
    return connectionsRetriever.fetchConnections()
  }
}