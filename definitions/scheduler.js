// User's notifications
F.schedule('08:00', '1 day', function() {
	OPERATION('users.notify', NOOP);
});