/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 * Source code licensed to GOOEE Limited and other parties, subject to restrictions of use.
 * Copying and unauthorised use of this material strictly prohibited.
 */

const config = require('@evrythng/thng-node-config');
const { resolve } = require('path');

const dir = resolve(__dirname, '../config');

module.exports = config(dir);
