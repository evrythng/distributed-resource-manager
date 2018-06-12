/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const resourcesOrchestrator = require('../../lib/resources-orchestrator');
const sinon = require('sinon');
const Ringpop = require('ringpop');
const logger = require('../../lib/logger');
const { assert } = require('chai');
const resourceHandler = require('../../lib/resource-handler');
const httpResourcePlugin = require('../../lib/http-resources-plugin');
const resourcesRetriever = require('../../lib/resources-retriever');

const sandbox = sinon.createSandbox();

describe('Resources orchestrator', () => {
  let ringpopInstance;

  beforeEach(() => {
    logger.setupLogger();
    ringpopInstance = sandbox.createStubInstance(Ringpop);

    sandbox.stub(httpResourcePlugin, 'fetchResources');

    ringpopInstance.whoami.returns(true);

    resourcesOrchestrator.resetResourcesHandledByThisHashring();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should call the provided resource handler for each resource allocated to this instance', async () => {
    ringpopInstance.lookup.onCall(0).returns(true);
    ringpopInstance.lookup.onCall(1).returns(true);
    ringpopInstance.lookup.onCall(2).returns(false);

    const spy = sinon.spy();

    const resourceHandlerDefinition = {
      handleResource: spy,
      handleFailedResource: sinon.spy(),
    };

    resourceHandler.setupResourceHandler(resourceHandlerDefinition);
    const resources = [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
    ];

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources);

    const resourcesForThisHashRing = resourcesOrchestrator.getResourcesHandledByThisHashring();

    assert.ok(spy.calledTwice);
    assert.deepEqual(resourcesForThisHashRing, resources.slice(0, 2));
  });

  it('should call the "handleFailedResource" function if there is an error when handling the resource ', async () => {
    const stub = sinon.stub();
    const spy = sinon.spy();
    const resourceHandlerDefinition = {
      handleResource: stub,
      handleFailedResource: spy,
    };

    resourceHandler.setupResourceHandler(resourceHandlerDefinition);

    stub.onCall(0).resolves();
    stub.onCall(1).throws();
    stub.onCall(2).throws();

    ringpopInstance.lookup.returns(true);

    const resources = [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
    ];

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources);

    const resourcesForThisHashRing = resourcesOrchestrator.getResourcesHandledByThisHashring();

    assert.ok(spy.calledTwice);
    assert.deepEqual(resourcesForThisHashRing, resources.slice(0, 1));
  });

  it('should rebalance the resources', async () => {
    ringpopInstance.lookup.onCall(0).returns(true);
    ringpopInstance.lookup.onCall(1).returns(false);
    ringpopInstance.lookup.onCall(2).returns(true);
    ringpopInstance.lookup.onCall(3).returns(false);

    const handleResourceSpy = sinon.spy();
    const terminateResourceSpy = sinon.spy();

    const resourceHandlerDefinition = {
      handleResource: handleResourceSpy,
      handleFailedResource: sinon.spy(),
      terminateResource: terminateResourceSpy,
    };

    resourceHandler.setupResourceHandler(resourceHandlerDefinition);
    await resourcesRetriever.setupResourcesRetriever(httpResourcePlugin, {
      resourcesUrl: 'http://test.com',
    });

    const resources = [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
      {
        id: '4',
      },
    ];

    httpResourcePlugin.fetchResources.resolves(resources);

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources);

    ringpopInstance.lookup.onCall(4).returns(false);
    ringpopInstance.lookup.onCall(5).returns(false);
    ringpopInstance.lookup.onCall(6).returns(true);
    ringpopInstance.lookup.onCall(7).returns(true);
    ringpopInstance.lookup.onCall(8).returns(true);

    handleResourceSpy.resetHistory();
    terminateResourceSpy.resetHistory();

    const newResources = resources.concat({ id: '5' });

    httpResourcePlugin.fetchResources.resolves(newResources);

    await resourcesOrchestrator.rebalanceResources(ringpopInstance);

    const resourcesForThisHashRing = resourcesOrchestrator.getResourcesHandledByThisHashring();

    assert.ok(handleResourceSpy.calledWithExactly({ id: '4' }));
    assert.ok(handleResourceSpy.calledWithExactly({ id: '5' }));

    assert.ok(terminateResourceSpy.calledOnceWithExactly({ id: '1' }));
    assert.deepEqual(resourcesForThisHashRing, newResources.slice(2));
  });

  it('should call the "handleFailedTermination" handler if there was an error when terminating the resource', async () => {
    ringpopInstance.lookup.onCall(0).returns(true);
    ringpopInstance.lookup.onCall(1).returns(false);
    ringpopInstance.lookup.onCall(2).returns(true);
    ringpopInstance.lookup.onCall(3).returns(false);

    const handleResourceSpy = sinon.spy();
    const terminateResourceStub = sinon.stub();
    const failedTerminationSpy = sinon.spy();

    const resourceHandlerDefinition = {
      handleResource: handleResourceSpy,
      handleFailedResource: sinon.spy(),
      terminateResource: terminateResourceStub,
      handleFailedTermination: failedTerminationSpy,
    };

    resourceHandler.setupResourceHandler(resourceHandlerDefinition);
    await resourcesRetriever.setupResourcesRetriever(httpResourcePlugin, {
      resourcesUrl: 'http://test.com',
    });

    const resources = [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
      {
        id: '4',
      },
    ];

    httpResourcePlugin.fetchResources.resolves(resources);

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources);

    ringpopInstance.lookup.onCall(4).returns(false);
    ringpopInstance.lookup.onCall(5).returns(false);
    ringpopInstance.lookup.onCall(6).returns(true);
    ringpopInstance.lookup.onCall(7).returns(true);

    terminateResourceStub.onCall(0).throws();

    await resourcesOrchestrator.rebalanceResources(ringpopInstance);

    const resourcesForThisHashRing = resourcesOrchestrator.getResourcesHandledByThisHashring();

    assert.deepEqual(resourcesForThisHashRing, resources.slice(2));
  });

  it('should rebalance the resources and use the cached resources if specified', async () => {
    ringpopInstance.lookup.onCall(0).returns(true);
    ringpopInstance.lookup.onCall(1).returns(false);
    ringpopInstance.lookup.onCall(2).returns(true);
    ringpopInstance.lookup.onCall(3).returns(false);

    const handleResourceSpy = sinon.spy();
    const terminateResourceSpy = sinon.spy();

    const resourceHandlerDefinition = {
      handleResource: handleResourceSpy,
      handleFailedResource: sinon.spy(),
      terminateResource: terminateResourceSpy,
    };

    resourceHandler.setupResourceHandler(resourceHandlerDefinition);
    await resourcesRetriever.setupResourcesRetriever(httpResourcePlugin, {
      resourcesUrl: 'http://test.com',
    });

    const resources = [
      {
        id: '1',
      },
      {
        id: '2',
      },
      {
        id: '3',
      },
      {
        id: '4',
      },
    ];

    httpResourcePlugin.fetchResources.resolves(resources);

    await resourcesOrchestrator.initialSetup(ringpopInstance, resources, true);

    ringpopInstance.lookup.onCall(4).returns(false);
    ringpopInstance.lookup.onCall(5).returns(false);
    ringpopInstance.lookup.onCall(6).returns(true);
    ringpopInstance.lookup.onCall(7).returns(true);

    handleResourceSpy.resetHistory();
    terminateResourceSpy.resetHistory();

    await resourcesOrchestrator.rebalanceResources(ringpopInstance);

    const resourcesForThisHashRing = resourcesOrchestrator.getResourcesHandledByThisHashring();

    assert.ok(httpResourcePlugin.fetchResources.calledOnce);
    assert.ok(handleResourceSpy.calledWithExactly({ id: '4' }));

    assert.deepEqual(resourcesForThisHashRing, resources.slice(2));
  });
});
