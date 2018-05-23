/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const bunyan = require('bunyan');

let logger;

module.exports = {
  /**
   *
   * @param {Logger} newLogger
   * @param {Object} loggerChildConfig
   * @returns {Logger}
   */
  setupLogger(newLogger, loggerChildConfig) {
    if (newLogger) {
      logger = newLogger.child(loggerChildConfig);

      return logger;
    }

    const loggerSettings = {
      level: bunyan.FATAL + 1,
      name: 'connection-manager',
    };

    logger = bunyan.createLogger(loggerSettings);
    logger.on('error', (err) => {
      console.error('Cannot setup logger.', err);
    });

    return logger;
  },
  /**
   *
   * @returns {Logger}
   */
  getLogger() {
    return logger;
  }
}