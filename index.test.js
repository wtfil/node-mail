var sendMail = require('./index'),
	expect = require('chai').expect,
	Promice = require('davy'),
	MailParser = require('mailparser').MailParser,
	EventEmitter = require('events').EventEmitter,
	ee = new EventEmitter(),
	simplesmtp = require('simplesmtp');

function sendAndReceive(email, callback) {
	return new Promice(function (resolve, reject) {
		sendMail(email)
			.on('error', reject)
			.on('sent', function () {
				ee.once('email', resolve);
			});
	});
}

describe('node-mail', function () {
	var server;
	before(function () {

		server = simplesmtp.createSimpleServer({}, function (req) {
			var parser = new MailParser();
			parser.on('end', function (email) {
				ee.emit('email', email);
			});
			req.pipe(parser);
		});
		server.listen(2525);

	});

	it('simple message', function () {
		return sendAndReceive({
			from: 'evgen.filatov@gmail.com',
			to: 'olo@gmail.com',
			smtp: '127.0.0.1',
			port: '2525',
			message: 'simple text',
			subject: 'test subject'
		}).then(function (email) {
			console.log(email);
			expect(email).to.have.property('text', 'simple text');
			expect(email).to.have.property('subject', 'test subject');
		});
	});

});
