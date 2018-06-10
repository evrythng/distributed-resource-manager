/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const fetch = require('node-fetch');
const logger = require('./logger');
const util = require('util');

let resourcesUrl;
let nodeFetchOptions;
let resourceManager;

/**
 *
 * @param {Integer} howOftenToPoll
 */
function pollForNewResources(howOftenToPoll = 60000) {
  const log = logger.getLogger();

  setInterval(async () => {
    log.debug('Polling for new resources');

    const newResources = await fetchResources();

    newResources.forEach(async resource => {
      try {
        await resourceManager.allocateResource(resource);
      } catch(err) {
        log.error(err, 'Error when polling for new resources');
      }
    });
  }, howOftenToPoll)
}

/**
 *
 * @returns {Promise<{ id: String }[]>}
 */
async function fetchResources() {
  const log = logger.getLogger();

  log.info(`Fetching resources from: ${resourcesUrl} with the following options: ${util.inspect(nodeFetchOptions)}`)
  const response = await fetch(resourcesUrl, nodeFetchOptions);

  if (response.status > 299) {
    throw new Error(`Received a ${response.status} error when fetching the resources at: ${resourcesUrl}`);
  }

  const json = await response.json();

  return json.data;
}

module.exports = {
  /**
   *
   * @param {Object} config
   * @param {String} config.resourcesUrl
   * @param {Object} config.nodeFetchOptions
   * @param {Boolean} config.pollForNewResources
   * @param {Integer} config.howOftenToPoll
   * @param {ResourceManagerApi} resourceManagerApi
   */
  setup(config, resourceManagerApi) {
    resourcesUrl = config.resourcesUrl;
    nodeFetchOptions = config.nodeFetchOptions;
    resourceManager = resourceManagerApi;

    if (config.pollForNewResources) {
      pollForNewResources(config.howOftenToPoll)
    }
  },
  /**
   *
   * @returns {Promise<{ id: String }[]>}
   */
  fetchResources,
  tearDown() {}
}
