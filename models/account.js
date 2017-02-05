NEWSCHEMA('Account').make(function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('password', 'String(30)');
	schema.define('picture', 'String(30)');
	schema.define('notifications', Boolean);

	schema.setSave(function(error, model, options, callback, controller) {

		var user = F.global.users.findItem('id', controller.user.id);
		if (user) {
			user.name = model.name;
			user.email = model.email;
			user.picture = model.picture;
			user.notifications = model.notifications;
			model.password && !model.password.startsWith('****') && (user.password = model.password.sha1());
			OPERATION('users.save', NOOP);
		}

		callback(SUCCESS(true));
	});

});