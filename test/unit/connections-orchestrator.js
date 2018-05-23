/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const connectionsOrchestrator = require('../../lib/connections-orchestrator');
const sinon = require('sinon');
const hashring = require('swim-hashring');
const logger = require('../../lib/logger');
const { assert } = require('chai');
const connectionHandler = require('../../lib/connection-handler');
const httpConnectionsPlugin = require('../../lib/http-connections-plugin');
const connectionsRetriever = require('../../lib/connections-retriever');

const sandbox = sinon.createSandbox();

describe('Connections orchestrator', () => {
  let hashRingInstance;

  beforeEach(() => {
    logger.setupLogger();
    hashRingInstance = sandbox.createStubInstance(hashring);

    sandbox.stub(httpConnectionsPlugin, 'fetchConnections');

    connectionsOrchestrator.resetConnectionsHandledByThisHashring();
  })

  afterEach(() => {
    sandbox.restore();
  })

  it('should call the provided connection handler for each connection allocated to this instance', async () => {
    hashRingInstance.allocatedToMe.onCall(0).returns(true);
    hashRingInstance.allocatedToMe.onCall(1).returns(true);
    hashRingInstance.allocatedToMe.onCall(2).returns(false);

    const spy = sinon.spy();

    const connectionHandlerDefinition = {
      handleConnection: spy,
      handleFailedConnection: sinon.spy()
    }

    connectionHandler.setupConnectionHandler(connectionHandlerDefinition);
    const connections = [
      {
        id: '1'
      },
      {
        id: '2'
      },
      {
        id: '3'
      }
    ]

    await connectionsOrchestrator.initialSetup(hashRingInstance, connections);

    const connectionsForThisHashRing = connectionsOrchestrator.getConnectionsHandledByThisHashring();

    assert.ok(spy.calledTwice);
    assert.deepEqual(connectionsForThisHashRing, connections.slice(0, 2));
  })

  it('should call the "handleFailedConnection" function if there is an error when handling the connection ', async () => {
    const stub = sinon.stub();
    const spy = sinon.spy();
    const connectionHandlerDefinition = {
      handleConnection: stub,
      handleFailedConnection: spy
    }

    connectionHandler.setupConnectionHandler(connectionHandlerDefinition);

    stub.onCall(0).resolves();
    stub.onCall(1).throws();
    stub.onCall(2).throws();

    hashRingInstance.allocatedToMe.returns(true);

    const connections = [
      {
        id: '1'
      },
      {
        id: '2'
      },
      {
        id: '3'
      }
    ]

    await connectionsOrchestrator.initialSetup(hashRingInstance, connections);

    const connectionsForThisHashRing = connectionsOrchestrator.getConnectionsHandledByThisHashring();

    assert.ok(spy.calledTwice);
    assert.deepEqual(connectionsForThisHashRing, connections.slice(0, 1));
  })

  it('should rebalance the connections', async () => {
    hashRingInstance.allocatedToMe.onCall(0).returns(true);
    hashRingInstance.allocatedToMe.onCall(1).returns(false);
    hashRingInstance.allocatedToMe.onCall(2).returns(true);
    hashRingInstance.allocatedToMe.onCall(3).returns(false);

    const handleConnectionSpy = sinon.spy();
    const terminateConnectionSpy = sinon.spy();

    const connectionHandlerDefinition = {
      handleConnection: handleConnectionSpy,
      handleFailedConnection: sinon.spy(),
      terminateConnection: terminateConnectionSpy
    }

    connectionHandler.setupConnectionHandler(connectionHandlerDefinition);
    await connectionsRetriever.setupConnectionsRetriever(httpConnectionsPlugin, {
      connectionsUrl: 'http://test.com'
    });

    const connections = [
      {
        id: '1'
      },
      {
        id: '2'
      },
      {
        id: '3'
      },
      {
        id: '4'
      }
    ]

    httpConnectionsPlugin.fetchConnections.resolves(connections);

    await connectionsOrchestrator.initialSetup(hashRingInstance, connections);

    hashRingInstance.allocatedToMe.onCall(4).returns(false);
    hashRingInstance.allocatedToMe.onCall(5).returns(false);
    hashRingInstance.allocatedToMe.onCall(6).returns(true);
    hashRingInstance.allocatedToMe.onCall(7).returns(true);
    hashRingInstance.allocatedToMe.onCall(8).returns(true);

    handleConnectionSpy.resetHistory();
    terminateConnectionSpy.resetHistory();

    const newConnections = connections.concat({id: '5'});

    httpConnectionsPlugin.fetchConnections.resolves(newConnections);

    await connectionsOrchestrator.rebalanceConnections(hashRingInstance);

    const connectionsForThisHashRing = connectionsOrchestrator.getConnectionsHandledByThisHashring();

    assert.ok(handleConnectionSpy.calledWithExactly({id: '4'}));
    assert.ok(handleConnectionSpy.calledWithExactly({id: '5'}));

    assert.ok(terminateConnectionSpy.calledOnceWithExactly({id: '1'}));
    assert.deepEqual(connectionsForThisHashRing, newConnections.slice(2));
  })

  it('should call the "handleFailedTermination" handler if there was an error when terminating the connection', async () => {
    hashRingInstance.allocatedToMe.onCall(0).returns(true);
    hashRingInstance.allocatedToMe.onCall(1).returns(false);
    hashRingInstance.allocatedToMe.onCall(2).returns(true);
    hashRingInstance.allocatedToMe.onCall(3).returns(false);

    const handleConnectionSpy = sinon.spy();
    const terminateConnectionStub = sinon.stub();
    const failedTerminationSpy = sinon.spy();

    const connectionHandlerDefinition = {
      handleConnection: handleConnectionSpy,
      handleFailedConnection: sinon.spy(),
      terminateConnection: terminateConnectionStub,
      handleFailedTermination: failedTerminationSpy
    }

    connectionHandler.setupConnectionHandler(connectionHandlerDefinition);
    await connectionsRetriever.setupConnectionsRetriever(httpConnectionsPlugin, {
      connectionsUrl: 'http://test.com'
    });

    const connections = [
      {
        id: '1'
      },
      {
        id: '2'
      },
      {
        id: '3'
      },
      {
        id: '4'
      }
    ]

    httpConnectionsPlugin.fetchConnections.resolves(connections);

    await connectionsOrchestrator.initialSetup(hashRingInstance, connections);

    hashRingInstance.allocatedToMe.onCall(4).returns(false);
    hashRingInstance.allocatedToMe.onCall(5).returns(false);
    hashRingInstance.allocatedToMe.onCall(6).returns(true);
    hashRingInstance.allocatedToMe.onCall(7).returns(true);

    terminateConnectionStub.onCall(0).throws();

    await connectionsOrchestrator.rebalanceConnections(hashRingInstance);

    const connectionsForThisHashRing = connectionsOrchestrator.getConnectionsHandledByThisHashring();

    assert.deepEqual(connectionsForThisHashRing, connections.slice(2));
  })

  it('should rebalance the connections and use the cached connections if specified', async () => {
    hashRingInstance.allocatedToMe.onCall(0).returns(true);
    hashRingInstance.allocatedToMe.onCall(1).returns(false);
    hashRingInstance.allocatedToMe.onCall(2).returns(true);
    hashRingInstance.allocatedToMe.onCall(3).returns(false);

    const handleConnectionSpy = sinon.spy();
    const terminateConnectionSpy = sinon.spy();

    const connectionHandlerDefinition = {
      handleConnection: handleConnectionSpy,
      handleFailedConnection: sinon.spy(),
      terminateConnection: terminateConnectionSpy
    }

    connectionHandler.setupConnectionHandler(connectionHandlerDefinition);
    await connectionsRetriever.setupConnectionsRetriever(httpConnectionsPlugin, {
      connectionsUrl: 'http://test.com'
    });

    const connections = [
      {
        id: '1'
      },
      {
        id: '2'
      },
      {
        id: '3'
      },
      {
        id: '4'
      }
    ]

    httpConnectionsPlugin.fetchConnections.resolves(connections);

    await connectionsOrchestrator.initialSetup(hashRingInstance, connections, true);

    hashRingInstance.allocatedToMe.onCall(4).returns(false);
    hashRingInstance.allocatedToMe.onCall(5).returns(false);
    hashRingInstance.allocatedToMe.onCall(6).returns(true);
    hashRingInstance.allocatedToMe.onCall(7).returns(true);

    handleConnectionSpy.resetHistory();
    terminateConnectionSpy.resetHistory();

    await connectionsOrchestrator.rebalanceConnections(hashRingInstance);

    const connectionsForThisHashRing = connectionsOrchestrator.getConnectionsHandledByThisHashring();

    assert.ok(httpConnectionsPlugin.fetchConnections.calledOnce);
    assert.ok(handleConnectionSpy.calledWithExactly({id: '4'}));

    assert.deepEqual(connectionsForThisHashRing, connections.slice(2));
  })
})