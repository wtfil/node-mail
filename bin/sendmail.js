#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander'),
    mail = require('../'),
    options;

program
    .version(require('../package.json').version)
    .option('-f, --from [value]', 'sender email')
    .option('-p, --password [value]', 'your password')
    .option('-t, --to [value]', 'receiver email')
    .option('-s, --smtp [value]', 'smtp server hostname')
    .parse(process.argv);


if (!program.from || !program.to) {
    program.help();
}

options = ['file', 'smtp', 'text', 'from', 'to', 'password'].reduce(function (o, key) {
    if (program[key]) {
        o[key] = program[key];
    }
    return o;
}, {});
options.text = program.args[0];

mail(options)
    .on('send', function () {
        this.destroy();
        console.log('successful send');
    })
    .on('exit', function () {
        console.log('drain');
    })
    .on('error', function (e) {
        console.error('\033[0;31mError:\033[0m ', e.message);
        process.exit();
    });
