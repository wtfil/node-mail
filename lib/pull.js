var fs = require('fs'),
    mime = require('mime'),
    CR = "\r\n",
    id = 1,
    MARKER = 'AttachMarker';

module.exports = Pull;

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
function Pull(options) {
    this._options = options;
    this.id = id ++;
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
Pull.prototype.next = function (text) {
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
        message.push('Date:' + new Date(options.date).toUTCString());
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
    } else if (options.message) {
        message.push(CR + options.message);
    }
    message.push('.');
    return message.join(CR);
}
