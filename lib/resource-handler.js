/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

/**
 * @typedef {Object} ResourceHandler
 * @property {Function} handleResource
 * @property {Function} handleFailedResource
 * @property {Function} terminateResource
 * @property {Function} handleFailedTermination
 *
 */

let resourceHandler;

module.exports = {
  /**
   *
   * @param {ResourceHandler} handler
   */
  setupResourceHandler(handler) {
    resourceHandler = handler;
  },
  /**
   *
   * @returns {ResourceHandler}
   */
  getResourceHandler() {
    return resourceHandler;
  }
}