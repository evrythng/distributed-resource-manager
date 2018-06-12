/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

/**
 * @typedef {Object} ResourcesRetrieverPlugin
 * @property {Function} setup
 * @property {Function} fetchResources
 * @property {Function} tearDown
 *
 */


let resourcesRetriever;

module.exports = {
  /**
   *
   * @param {ResourcesRetrieverPlugin} resourcesRetrieverPlugin
   * @param {Object} resourcesRetrieverConfig
   * @param {ResourceManagerApi} resourceManagerApi
   * @returns {Promise}
   */
  setupResourcesRetriever(resourcesRetrieverPlugin, resourcesRetrieverConfig, resourceManagerApi) {
    resourcesRetriever = resourcesRetrieverPlugin;

    return resourcesRetriever.setup(resourcesRetrieverConfig, resourceManagerApi);
  },
  /**
   *
   * @returns {ResourcesRetrieverPlugin}
   */
  getResourcesRetriever() {
    return resourcesRetriever;
  },
  /**
   *
   * @returns {Promise}
   */
  fetchResources() {
    return resourcesRetriever.fetchResources();
  },
  /**
   *
   * @returns {Promise}
   */
  tearDown() {
    return resourcesRetriever.tearDown();
  },
};
