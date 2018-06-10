/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const logger = require('./logger');
const _ = require('lodash');
const resourcesRetriever = require('./resources-retriever');
const util = require('util');
const resourceHandler = require('./resource-handler');

let allResources;
let resourcesHandledByThisHashring = [];

/**
 *
 * @param {Ringpop} ringpopInstance
 * @param {{ id: String }[]} resources
 * @returns {{ id: String }[]}
 */
function filterResourcesForThisHashring(ringpopInstance, resources) {
  return resources.filter(resource => {
    const node = ringpopInstance.lookup(resource.id);

    if (node === ringpopInstance.whoami()) {
      return true;
    } else {
      return false;
    }
  });
}

/**
 *
 * @param {{ id: String }} resource
 * @param {ResourceHandler} resourceHandlerDefinition
 * @param {Logger} log
 * @returns {Promise.<void>}
 */
async function handleNewResources(resource, resourceHandlerDefinition, log) {
  const resourceAlreadyHandled = _.find(resourcesHandledByThisHashring, {id: resource.id});

  if (resourceAlreadyHandled) {
    log.debug(`Resource id: ${resource.id} is already being handled`);
    return;
  }

  try {
    await resourceHandlerDefinition.handleResource(resource);

    resourcesHandledByThisHashring.push(resource);
  } catch(err) {
    log.error(err, `There was an error when applying 'handleResource' to this resource: ${util.inspect(resource)}`);

    resourceHandlerDefinition.handleFailedResource(resource);
  }
}

/**
 *
 * @param {{ id: String }} resource
 * @param {ResourceHandler} resourceHandlerDefinition
 * @param {Logger} log
 * @returns {Promise.<void>}
 */
async function handleResourceTermination(resource, resourceHandlerDefinition, log) {
  _.remove(resourcesHandledByThisHashring, res => res.id === resource.id);

  try {
    await resourceHandlerDefinition.terminateResource(resource);
  } catch(err) {
    log.error(err, `There was an error when applying 'terminateResource' to this resource: ${util.inspect(resource)}`);

    resourceHandlerDefinition.handleFailedTermination(resource);
  }
}

module.exports = {
  /**
   *
   * @param {Ringpop} ringpopInstance
   * @param {{ id: String }[]} resources
   * @param {Boolean} cacheAllResources
   * @returns {Promise}
   */
  async initialSetup(ringpopInstance, resources, cacheAllResources = false) {
    const log = logger.getLogger();

    log.info('Setting up resources');

    const resourceHandlerDefinition = resourceHandler.getResourceHandler();

    if (cacheAllResources) {
      allResources = resources;
    }

    const resourcesForThisHashring = filterResourcesForThisHashring(ringpopInstance, resources);

    log.info(`There are ${resourcesForThisHashring.length} resources to be handled`);

    await Promise.all(resourcesForThisHashring.map(resource => handleNewResources(resource, resourceHandlerDefinition, log)));
  },
  /**
   *
   * @param {Ringpop} ringpopInstance
   */
  async rebalanceResources(ringpopInstance) {
    const log = logger.getLogger();

    log.info('Rebalancing resources');

    let newResourcesForThisHashring;

    if (!_.isEmpty(allResources)) {
      newResourcesForThisHashring = filterResourcesForThisHashring(ringpopInstance, allResources);
    } else {
      const resources = await resourcesRetriever.fetchResources();

      newResourcesForThisHashring = filterResourcesForThisHashring(ringpopInstance, resources);
    }

    const resourcesToBeDeallocated = resourcesHandledByThisHashring.filter(resource => {
      return !_.findWhere(newResourcesForThisHashring, { id: resource.id });
    });
    const resourcesToBeAllocated = newResourcesForThisHashring.filter(resource => {
      return !_.findWhere(resourcesHandledByThisHashring, { id: resource.id });
    });

    log.debug(`There are ${resourcesToBeDeallocated.length} resources to be terminated and ${resourcesToBeAllocated.length} to be added`);

    const resourceHandlerDefinition = resourceHandler.getResourceHandler();

    const newResourcesPromises = resourcesToBeAllocated.map(resource => handleNewResources(resource, resourceHandlerDefinition, log));
    const oldResourcesPromises = resourcesToBeDeallocated.map(resource => handleResourceTermination(resource, resourceHandlerDefinition, log));

    await Promise.all(newResourcesPromises.concat(oldResourcesPromises));
  },
  handleNewResources(resource) {
    const log = logger.getLogger();
    const resourceHandlerDefinition = resourceHandler.getResourceHandler();

    return handleNewResources(resource, resourceHandlerDefinition, log);
  },
  handleResourceTermination(resource) {
    const log = logger.getLogger();
    const resourceHandlerDefinition = resourceHandler.getResourceHandler();

    return handleResourceTermination(resource, resourceHandlerDefinition, log);
  },
  getResourcesHandledByThisHashring() {
    return _.cloneDeep(resourcesHandledByThisHashring);
  },
  resetResourcesHandledByThisHashring() {
    resourcesHandledByThisHashring = [];
  }
}