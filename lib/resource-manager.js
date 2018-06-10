/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const logger = require('./logger');
const hashring = require('./hash-ring');
const httpResourcesPlugin = require('./http-resources-plugin');
const resourcesOrchestrator = require('./resources-orchestrator');
const resourcesRetriever = require('./resources-retriever');
const resourceHandler = require('./resource-handler');
const validateConfig = require('./validate-config');

/**
 * @typedef {Object} ResourceManagerApi
 * @property {Function} allocateResource
 * @property {Function} deallocateResource
 * @property {Function} stop
 *
 */

const resourceManagerApi = {
  allocateResource(resource) {
    return hashring.allocateResource(resource);
  },
  deallocateResource(resource) {
    return hashring.deallocateResource(resource);
  },
  async stop() {
    hashring.stop();

    await Promise.all(resourcesOrchestrator.getResourcesHandledByThisHashring().map(resourcesOrchestrator.handleResourceTermination));

    await resourcesRetriever.tearDown();
  }
}

/**
 * @typedef {Object} Config
 * @property {Object} ringpopOptions
 * @property {String} ringpopOptions.host
 * @property {Integer} ringpopOptions.port
 * @property {String} ringpopOptions.app
 * @property {Array<String>} ringpopHosts
 * @property {Logger} logger
 * @property {Object} loggerChildConfig
 * @property {Object} fetchResourcesHttpOptions
 * @property {String} fetchResourcesHttpOptions.resourcesUrl
 * @property {Object} fetchResourcesHttpOptions.nodeFetchOptions
 * @property {Boolean} fetchResourcesHttpOptions.pollForNewResources
 * @property {Integer} fetchResourcesHttpOptions.howOftenToPoll
 * @property {Boolean} cacheAllResources
 * @property {ResourceHandler} resourceHandler
 * @property {ResourcesRetrieverPlugin} resourcesRetrieverPlugin
 * @property {Object} resourcesRetrieverConfig
 * @property {Integer} maxLengthOfTimeToRetryResourceFetching
 */

/**
 *
 * @param {Config} config
 * @returns {ResourceManagerApi}
 */
module.exports = async (config) => {
  const log = logger.setupLogger(config.logger, config.loggerChildConfig);

  log.info('Setting up distributed resource manager');

  const {error} = validateConfig(config);

  if (error) {
    throw error;
  }

  resourceHandler.setupResourceHandler(config.resourceHandler);

  const ringpopInstance = await hashring.setupHashring(config.ringpopOptions, config.ringpopHosts);

  let resourcesRetrieverPluginSpecified;

  if (config.resourcesRetrieverPlugin) {
    resourcesRetrieverPluginSpecified = config.resourcesRetrieverPlugin;
  } else {
    resourcesRetrieverPluginSpecified = httpResourcesPlugin;
  }

  try {
    const resourcesRetrieverConfig = config.resourcesRetrieverConfig ? config.resourcesRetrieverConfig : config.fetchResourcesHttpOptions;

    await resourcesRetriever.setupResourcesRetriever(resourcesRetrieverPluginSpecified, resourcesRetrieverConfig, resourceManagerApi);
    const resources = await resourcesRetriever.fetchResources();

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources, config.cacheAllResources);

    hashring.setupEventListeners(config.maxLengthOfTimeToRetryResourceFetching);

    log.info('Distributed resource manager has finished setup');

    return resourceManagerApi;
  } catch(err) {
    hashring.stop();

    await resourcesRetriever.tearDown();

    throw err;
  }
}