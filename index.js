var net = require('net'),
    Promise = require('davy'),
    Pull = require('./lib/pull'),
    Delay = require('./lib/delay-stream'),
    CR = "\r\n";

function Smtp(options) {
    this._working = true;
    this._options = options;
    net.Socket.call(this, options);
}

Smtp.prototype = Object.create(net.Socket.prototype);

Smtp.prototype.send = function (options) {
    var _this = this,
        messages = new Pull(options);

    return this
        .on('data', function (data) {
            var text = data.toString('utf8'),
                next = messages.next(text);

            if (next.message) {
                this.write(next.message + CR);
            } else if (next.error) {
                this.emit('error', next.error);
            } else if (next.isLast) {
                this.emit('sent', messages.id);
            }
        });
};

function testSocket(port, host) {
    var client = net.connect({
        port: port,
        host: host
    }),
        promise = new Promise();

    client
        .on('connect', function () {
            promise.fulfill(true);
            client.destroy();
        })
        .on('error', function () {
            promise.fulfill(false);
            client.destroy();
        });

    return promise;
}

function resolveParams(options) {
	options = JSON.parse(JSON.stringify(options));
	options.date = options.date || Date.now();
	return options;
}

function send(options) {
	options = resolveParams(options);
    var client = new Smtp(options);

    return client
        .connect(options)
        .send(options)
        .on('sent', function () {
        	this.destroy();
        	return this;
        });
}

module.exports = send;
