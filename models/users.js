NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('password', 'String(30)');
	schema.define('position', 'String(30)', true);
	schema.define('picture', 'String(30)');
	schema.define('channels', 'Object');
	schema.define('blocked', Boolean);
	schema.define('notifications', Boolean);
	schema.define('sa', Boolean);

	schema.setSave(function(error, model, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		var tmp;

		if (model.id) {
			tmp = F.global.users.findItem('id', model.id);
			tmp.name = model.name;
			tmp.email = model.email;
			tmp.position = model.position;
			tmp.picture = model.picture;
			tmp.blocked = model.blocked;
			tmp.linker = model.name.slug();
			tmp.channels = model.channels;
			tmp.notifications = model.notifications;
			model.password && !model.password.startsWith('****') && (tmp.password = model.password.sha1());
		} else {
			tmp = model.$clean();
			tmp.id = UID();
			tmp.password = model.password.sha1();
			tmp.datecreated = F.datetime;
			tmp.unread = {};
			tmp.recent = {};
			tmp.online = false;
			tmp.linker = model.name.slug();
			F.global.users.push(tmp);
		}

		F.global.users.quicksort('name');
		F.global.refresh && F.global.refresh();
		OPERATION('users.save', NOOP);
		callback(SUCCESS(true));
	});

	schema.setGet(function(error, model, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		var item = F.global.users.findItem('id', controller.id);
		!item && error.push('error-user-404');
		callback(item);
	});

	schema.setRemove(function(error, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		F.global.users = F.global.users.remove('id', controller.id);
		F.global.refresh && F.global.refresh();
		OPERATION('users.save', NOOP);
		callback(SUCCESS(true));
	});

});