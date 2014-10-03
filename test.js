var sendMail = require('./index');

sendMail({
	from: 'evgen.filatov@gmail.com',
	to: 'olo@gmail.com',
	smtp: '127.0.0.1',
	port: '2525',
	message: 'Qwe qw qwe qdas\nq wqej kqwelq ',
	subject: 'Test subject'
})
	.on('error', function (e) {
		console.error('error', e);
	})
	.on('data', function (data) {
		console.log('data', data.toString());
	})
	.on('server-data', function (data) {
		console.log('S', data);
	})
	.on('client-data', function (data) {
		console.log('C', data);
	})
	.on('sent', function (id) {
		console.log('sent', id);
	});
