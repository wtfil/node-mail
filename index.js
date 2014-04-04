var net = require('net'),
    Promise = require('davy'),
    fs = require('fs'),
    mime = require('mime'),
    MARKER = 'AttachMarker',
    CR = "\r\n";

function getAuthCommand(options) {
    if (!options.password) {
        return;
    }
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


function Smtp(options) {
    this._working = true;
    this._options = options;
    net.Socket.call(this, options);
}

Smtp.prototype = Object.create(net.Socket.prototype);

Smtp.prototype._nextMessage = function (text, options) {
    var code = Number(text.split(' ')[0]);
    
    if (code === 503) {
        this.writable = false;
        this.emit('error', new Error('Smtp server "' + options.smtp + '" required authorization'));
    }
    if (code === 530) {
        return 'STARTTLS';
    }
    return null;
};

Smtp.prototype.send = function (options) {
    var _this = this,
        messages = [
            'HELO test-client',
            getAuthCommand(options),
            'MAIL FROM:<' + options.from + '>',
            'RCPT TO:<' + options.to + '>',
            'DATA',
            getMessageText(options)
        ].filter(Boolean);

    return this.on('data', function (data) {
        var text = data.toString('utf8'),
            extraMessages = _this._nextMessage(text, options);

        console.log('S: ' + text);
        if (!_this.writable) {
            return;
        }
        if (extraMessages) {
            messages.unshift(extraMessages);
        }
        if (messages.length) {
            console.log('C: ' + messages[0]);
            _this.write(messages.shift() + CR);
        } else {
            _this.emit('send');
        }
    });
};

function testSocket(port, host) {
    var client = net.connect(port, host),
        promise = new Promise();

    client
        .on('connect', function () {
            console.log(1);
            promise.fulfill(true);
            client.destroy();
        })
        .on('error', function () {
            console.log(2);
            promise.fulfill(false);
            client.destroy();
        });

    return promise;
}

function findSMTPHost(options) {
    if (options.smtp) {
        return new Promise(options.smtp);
    }
    return testSocket(25).then(function (exist) {
        if (exist) {
            return 'localhost';
        }
        return 'smtp.' + options.from.split('@')[1];
    });
}


function send(options) {
    
    var client = new Smtp(options);

    findSMTPHost(options).then(function (smtp) {
        //TODO fix it
        options.smtp = smtp;
        client
            .connect({
                host: smtp,
                port: 25
            })
            .send(options);
    }, function (e) {
        client.emit('error', e);
    });

    return client
        .on('exit', function () {
            console.log('exit');
        });

}

send.Smtp = Smtp;
module.exports = send;
