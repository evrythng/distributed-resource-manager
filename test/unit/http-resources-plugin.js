/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const httpResourcesPlugin = require('../../lib/http-resources-plugin');
const nock = require('nock');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('../../lib/logger');

chai.use(chaiAsPromised);
const { assert } = chai;

describe('Http resources plugin', () => {
  const url = 'http://localhost/test';

  beforeEach(() => {
    logger.setupLogger();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should return a json response', async () => {
    httpResourcesPlugin.setup({
      resourcesUrl: url,
    });

    const response = {
      data: [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ],
    };

    nock(url)
      .get('')
      .reply(200, response);

    const resources = await httpResourcesPlugin.fetchResources();

    assert.deepEqual(resources, response.data);
  });

  it('should throw an error if the response status code is greater than 299', async () => {
    httpResourcesPlugin.setup({
      resourcesUrl: url,
    });

    nock(url)
      .get('')
      .reply(400);

    return assert.isRejected(httpResourcesPlugin.fetchResources(url));
  });

  it('should use the node fetch options if provided', async () => {
    httpResourcesPlugin.setup({
      resourcesUrl: url,
      nodeFetchOptions: {
        method: 'PUT',
      },
    });

    const response = {
      data: [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ],
    };

    nock(url)
      .put('')
      .reply(200, response);

    const resources = await httpResourcesPlugin.fetchResources();

    assert.deepEqual(resources, response.data);
  });
});
