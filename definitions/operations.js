const Fs = require('fs');

NEWOPERATION('users.save', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2('users.save', function() {
		Fs.writeFile(F.path.databases('users.json'), JSON.stringify(F.global.users), F.error());
	}, 500);
});

NEWOPERATION('users.load', function(error, value, callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {
		if (err)
			F.global.users = [];
		else
			F.global.users = data.toString('utf8').parseJSON(true);

		for (var i = 0, length = F.global.users.length; i < length; i++)
			F.global.users[i].online = false;

		callback(SUCCESS(true));
	});
});

NEWOPERATION('channels.save', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2('users.save', function() {
		Fs.writeFile(F.path.databases('channels.json'), JSON.stringify(F.global.channels), F.error());
	}, 500);
});

NEWOPERATION('channels.load', function(error, value, callback) {
	Fs.readFile(F.path.databases('channels.json'), function(err, data) {
		if (err)
			F.global.channels = [];
		else
			F.global.channels = data.toString('utf8').parseJSON(true);
		callback(SUCCESS(true));
	});
});

NEWOPERATION('messages.cleaner', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2(value, function() {
		var db = NOSQL(value);
		var max = 100;
		db.count().callback(function(err, count) {
			if (count > max) {
				count = count - max;
				db.remove().prepare((doc, index) => index < count);
			}
		});
	}, 30000);
});

F.wait('database');
F.on('ready', function() {
	setTimeout(() => F.wait('database'), 2000);
	OPERATION('users.load', NOOP);
	OPERATION('channels.load', NOOP);
});