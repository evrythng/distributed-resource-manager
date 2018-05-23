/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const fetch = require('node-fetch');
const logger = require('./logger');
const util = require('util');

let connectionsUrl;
let nodeFetchOptions;

module.exports = {
  /**
   *
   * @param {Object} config
   * @param {String} config.connectionsUrl
   * @param {Object} config.nodeFetchOptions
   */
  setup(config) {
    connectionsUrl = config.connectionsUrl;
    nodeFetchOptions = config.nodeFetchOptions
  },
  /**
   *
   * @returns {Promise<{ id: String }[]>}
   */
  async fetchConnections() {
    const log = logger.getLogger();

    log.info(`Fetching connections from: ${connectionsUrl} with the following options: ${util.inspect(nodeFetchOptions)}`)
    const response = await fetch(connectionsUrl, nodeFetchOptions);

    if (response.status > 299) {
      throw new Error(`Received a ${response.status} error when fetching the connections at: ${connectionsUrl}`);
    }

    const json = await response.json();

    return json.data;
  }
}
