/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const connectionsRetriever = require('../../lib/connections-retriever');
const httpConnectionsPlugin = require('../../lib/http-connections-plugin');
const { assert } = require('chai');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();

describe('Connections retriever', () => {
  beforeEach(() => {
    sandbox.stub(httpConnectionsPlugin, 'fetchConnections');

    httpConnectionsPlugin.fetchConnections.resolves();
  })

  afterEach(() => {
    sandbox.restore();
  })

  it('should setup the plugin for retrieving connections', async () => {
    await connectionsRetriever.setupConnectionsRetriever(httpConnectionsPlugin, {
      connectionsUrl: 'http://test.com'
    });

    assert.ok(connectionsRetriever.getConnectionsRetriever() === httpConnectionsPlugin);
  })

  it('should delegate fetching connections to the plugin', async () => {
    await connectionsRetriever.setupConnectionsRetriever(httpConnectionsPlugin, {
      connectionsUrl: 'http://test.com'
    });

    await connectionsRetriever.fetchConnections();

    assert.ok(httpConnectionsPlugin.fetchConnections.calledOnce);
  })
})