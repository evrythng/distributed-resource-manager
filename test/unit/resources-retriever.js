/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const resourcesRetriever = require('../../lib/resources-retriever');
const httpResourcesPlugin = require('../../lib/http-resources-plugin');
const { assert } = require('chai');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();

describe('Resources retriever', () => {
  beforeEach(() => {
    sandbox.stub(httpResourcesPlugin, 'fetchResources');

    httpResourcesPlugin.fetchResources.resolves();
  })

  afterEach(() => {
    sandbox.restore();
  })

  it('should setup the plugin for retrieving resources', async () => {
    await resourcesRetriever.setupResourcesRetriever(httpResourcesPlugin, {
      resourcesUrl: 'http://test.com'
    });

    assert.ok(resourcesRetriever.getResourcesRetriever() === httpResourcesPlugin);
  })

  it('should delegate fetching resources to the plugin', async () => {
    await resourcesRetriever.setupResourcesRetriever(httpResourcesPlugin, {
      resourcesUrl: 'http://test.com'
    });

    await resourcesRetriever.fetchResources();

    assert.ok(httpResourcesPlugin.fetchResources.calledOnce);
  })
})