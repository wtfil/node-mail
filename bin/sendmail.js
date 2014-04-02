#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

program
    .version(require('../package.json').version)
    .option('-f, --from [value]', 'Add peppers')
    .parse(process.argv);
