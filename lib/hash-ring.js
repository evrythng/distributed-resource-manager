/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const hashring = require('swim-hashring');
const logger = require('./logger');
const connectionsOrchestrator = require('./connections-orchestrator');
const util = require('util');

let hashRingInstance;

module.exports = {
  /**
   *
   * @param {Object} swimHashRingOptions
   * @returns {Promise}
   */
  setupHashring(swimHashRingOptions) {
    const log = logger.getLogger();
    hashRingInstance = hashring(swimHashRingOptions);

    return new Promise(resolve => {
      hashRingInstance.once('up', () => {
        log.info('Hash ring ready');

        resolve(hashRingInstance);
      })
    })

  },
  setupEventListeners() {
    const log = logger.getLogger();

    hashRingInstance.on('peerUp', async (node) => {
      log.info({id: node.id, meta: node.meta}, `New node added to hash ring`);
       //retry here
      try {
        await connectionsOrchestrator.rebalanceConnections(hashRingInstance)
      } catch(err) {
        log.error(err);
      }
    });

    hashRingInstance.on('peerDown', async (node) => {
      log.info({id: node.id, meta: node.meta}, `Node removed from hash ring`);

      try {
        await connectionsOrchestrator.rebalanceConnections(hashRingInstance)
      } catch(err) {
        log.error(err);
      }
    });

    hashRingInstance.on('error', (err) => {
      log.error(err);
    })
  }
}