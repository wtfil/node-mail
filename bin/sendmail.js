#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander'),
    path = require('path'),
    mail = require('../'),
    options;

program
    .version(require('../package.json').version)
    .option('-f, --from [value]', 'sender email')
    .option('-p, --password [value]', 'your password')
    .option('-t, --to [value]', 'receiver email')
    .option('-s, --smtp [value]', 'smtp server hostname')
    .option('--file [value]', 'attach file')
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

if (program.file) {
    options.file = path.join(process.cwd(), program.file);
}
options.text = program.args[0];

mail(options)
    .on('send', function () {
        this.destroy();
        console.log('successful send');
    })
    .on('error', function (e) {
        console.error('\033[0;31mError:\033[0m ', e.message);
        process.exit();
    });
