// User's notifications
F.schedule('08:00', '1 day', function() {
	var time = ('1' + F.datetime.format('HHmm')).parseInt();
	(time > 10755 && time < 10825) && OPERATION('users.notify', NOOP);
});
