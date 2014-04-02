var net = require('net'),
    fs = require('fs'),
    mime = require('mime'),
    MARKER = 'AttachMarker',
    CR = "\r\n";

function getAuthCommand(options) {
    var userName = options.from.split('@')[0];
    return 'AUTH PLAIN ' + new Buffer([userName, userName, options.password].join("\0")).toString('base64');
}

function getMessageText(options) {
    var message = [
        'From: <' + options.from + '>',
        'To: <' + options.to + '>'
    ], filename, file;

    if (options.subject) {
        message.push('Subject: ' + options.subject);
    }
    if (options.date) {
        message.push('Date:' + new Date(options.date || Date.now()).toUTCString());
    }
    if (options.file) {
        filename = options.file.split('/').pop();
        message.push(
            'MIME-Version: 1.0',
            'Content-Type: multipart/mixed; boundary=' + MARKER,
            '--' + MARKER,
            'Content-Type: text/plain',
            options.text,
            '--' + MARKER,
            'Content-Type: ' + mime.lookup(filename) + '; charset=us-ascii; name=' + filename,
            'Content-Transfer-Encoding: base64',
            'Content-Disposition: attachment; filename=' + filename,
            file,
            '--' + MARKER
        );
    } else if (options.text) {
        message.push(options.text);
    }
    message.push('.');
    return message.join(CR);
}


function Smpt(options) {
    options.host = options.host || 'smtp' + options.from.split('@')[0];
    this._working = true;
    this._options = options;
    net.Socket.call(this, options);
    this.connect(options);
}

Smpt.prototype = Object.create(net.Socket.prototype);

Smpt.prototype._nextMessage = function (text, options) {
    
    if (text.match(/503/)) {
        if (this._tryLogin) {
            this._working = false;
            this.emit('error', new Error('Unsuccessful auth'));
            return null;
        }
        this._tryLogin = true;
        return getAuthCommand(options);
    }
    if (text.match(/334/)) {
    }
    return null;
};

Smpt.prototype.send = function (options) {
    var _this = this,
        messages = [
            'HELO test-client',
            getAuthCommand(options),
            'MAIL FROM:<' + options.from + '>',
            'RCPT TO:<' + options.to + '>',
            'DATA',
            getMessageText(options)
        ];

    return this
        .on('connect', function () {
            console.log('connected to ' + _this._options.host);
        })
        .on('data', function (data) {
            var text = data.toString('utf8'),
                extraMessages = _this._nextMessage(text, options);

            if (!_this._working) {
                return;
            }
            if (extraMessages) {
                messages.unshift(extraMessages);
            }
            if (messages.length) {
                _this.write(messages.shift() + CR);
            } else {
                _this.emit('send');
            }
        });
};


function send(options) {
    var client = new Smpt({
        host: options.smpt,
        port: 25
    });

    client.send(options)
        .on('send', function () {
            console.log('successful send');
            client.destroy();
        })
        .on('error', function (e) {
            console.error(e.stack);
            client.destroy();
        });

}

exports.send = send;
