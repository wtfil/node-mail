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

/**
 * SMPT message pull
 *
 * @param {Object} options
 * @param {String} options.from
 * @param {String} options.to
 * @param {String} options.smtp required for right error messages
 * @param {String} [options.password]
 * @param {String} [options.subject]
 * @param {String} [options.text]
 * @param {String} [options.date]
 * @param {String} [options.filename]
 */
function MessagesPull(options) {
    this._options = options;
    this._messages =  [
        'HELO test-client',
        getAuthCommand(options),
        'MAIL FROM:<' + options.from + '>',
        'RCPT TO:<' + options.to + '>',
        'DATA',
        getMessageText(options)
    ].filter(Boolean);

    this._index = 0;
}


/**
 * Getting next message based on SMTP server response
 * @see http://www.greenend.org.uk/rjk/tech/smtpreplies.html
 * @param {String} text
 *
 * @returns {Error|String|Null} next message or Error object or null if no message left
 */
MessagesPull.prototype.next = function (text) {
    var code = Number(text.split(' ')[0]),
        result = {
            isLast: false,
            error: null,
            message: null
        };

    if (this._index === this._messages.length && code === 250) {
        result.isLast = true;
        return result;
    }

    if ([220, 235, 250, 354].indexOf(code) !== -1) {
        result.message = this._messages[this._index ++] || null;
        return result;
    }

    // one message back to resent it
    this._index --;

    if (code === 503) {
        result.error = new Error('Smtp server "' + this._options.smtp + '" required authorization');
    }
    if (code === 530) {
        result.message = 'STARTTLS';
    }

    return result;
};


function Smtp(options) {
    this._working = true;
    this._options = options;
    net.Socket.call(this, options);
}

Smtp.prototype = Object.create(net.Socket.prototype);

Smtp.prototype.send = function (options) {
    var _this = this,
        messages = new MessagesPull(options);

    return this
        .on('data', function (data) {
            var text = data.toString('utf8'),
                next = messages.next(text);

            console.log('S: ' + text);
            console.log('C: ' + next.message);
            if (next.message) {
                this.write(next.message + CR);
            } else if (next.error) {
                this.emit('error', next.error);
            } else if (next.isLast) {
                this.emit('send');
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

function findSMTPHost(options) {
    if (options.smtp) {
        return new Promise(options.smtp);
    }
    return testSocket(25, 'localhost').then(function (exist) {
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

    return client;

}

send.Smtp = Smtp;
module.exports = send;
