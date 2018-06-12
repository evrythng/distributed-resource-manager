/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const Joi = require('joi');

const schema = Joi.object().keys({
  ringpopOptions: Joi.object().keys({
    host: Joi.string().hostname().required(),
    port: Joi.number().port().required(),
    app: Joi.string().required(),
  }).required(),
  ringpopHosts: Joi.array().items(Joi.string()).min(1).required(),
  logger: Joi.object(),
  loggerChildConfig: Joi.object(),
  fetchResourcesHttpOptions: Joi.object().keys({
    resourcesUrl: Joi.string().uri(),
    nodeFetchOptions: Joi.object(),
    pollForNewResources: Joi.boolean(),
    howOftenToPoll: Joi.number().integer(),
  }),
  cacheAllResources: Joi.boolean(),
  resourceHandler: Joi.object().keys({
    handleResource: Joi.func().minArity(1).required(),
    handleFailedResource: Joi.func().required(),
    terminateResource: Joi.func().minArity(1).required(),
    handleFailedTermination: Joi.func().required(),
  }).required(),
  resourcesRetrieverPlugin: Joi.object().keys({
    setup: Joi.func(),
    fetchResources: Joi.func(),
    tearDown: Joi.func(),
  }),
  resourcesRetrieverConfig: Joi.object(),
  maxLengthOfTimeToRetryResourceFetching: Joi.number(),
});


/**
 *
 * @param {Config} config
 */
module.exports = config => Joi.validate(config, schema);
