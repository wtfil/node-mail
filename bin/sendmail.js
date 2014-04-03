#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander'),
    mail = require('../'),
    options;

program
    .version(require('../package.json').version)
    .option('-f, --from [value]', 'from')
    .option('-p, --password [value]', 'password')
    .option('-q, --to [value]', 'to')
    .option('-s, --smtp [value]', 'to')
    .option('-t, --text [value]', 'text')
    .parse(process.argv);


options = ['file', 'smtp', 'text', 'from', 'to', 'password'].reduce(function (o, key) {
    o[key] = program[key];
    return o;
}, {});
console.log(options);
mail(options);
