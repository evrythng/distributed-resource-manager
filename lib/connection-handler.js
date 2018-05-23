/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

/**
 * @typedef {Object} ConnectionHandler
 * @property {Function} handleConnection
 * @property {Function} handleFailedConnection
 * @property {Function} terminateConnection
 * @property {Function} handleFailedTermination
 *
 */

let connectionHandler;

module.exports = {
  /**
   *
   * @param {ConnectionHandler} handler
   */
  setupConnectionHandler(handler) {
    connectionHandler = handler;
  },
  /**
   *
   * @returns {ConnectionHandler}
   */
  getConnectionHandler() {
    return connectionHandler;
  }
}