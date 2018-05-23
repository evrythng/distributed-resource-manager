/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const logger = require('../../lib/logger');
const bunyan = require('bunyan');
const { assert } = require('chai')
const sinon = require('sinon');

const sandbox = sinon.createSandbox();

describe('Logger', () => {

  it('should set up the logger', () => {
    const log = logger.setupLogger();

    assert.instanceOf(log, bunyan);
  })

  it('should return an instance of the logger', () => {
    const newLogger = logger.setupLogger();

    const log = logger.getLogger();

    assert.ok(log === newLogger);
  })

  describe('when a child logger is specified', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it('should set up the logger as a child if specified', () => {
      const mainLogger = bunyan.createLogger({name: 'test logger'});

      sandbox.stub(mainLogger, 'child');

      mainLogger.child.returnsThis();

      const log = logger.setupLogger(mainLogger);

      assert.instanceOf(log, bunyan);
      assert.ok(mainLogger.child.calledOnce);
    })

    it('should set up the logger as a child with the options specified', () => {
      const mainLogger = bunyan.createLogger({name: 'test logger'});

      sandbox.stub(mainLogger, 'child');

      mainLogger.child.returnsThis();

      const childConfigOptions = {
        service: 'main-app'
      };
      const log = logger.setupLogger(mainLogger, childConfigOptions);

      assert.instanceOf(log, bunyan);
      assert.ok(mainLogger.child.calledWithExactly(childConfigOptions));
    })
  })
})