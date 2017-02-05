NEWSCHEMA('Channel').make(function(schema) {
	schema.define('name', 'String(30)', true);

	schema.setSave(function(error, model, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		var tmp = model.$clean();
		tmp.id = UID();
		tmp.linker = model.name.slug();
		tmp.datecreated = F.datetime;
		F.global.channels.push(tmp);
		F.global.channels.quicksort('name');
		F.global.refresh && F.global.refresh();
		OPERATION('channels.save', NOOP);
		callback(SUCCESS(true));
	});

	schema.setRemove(function(error, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		F.global.channels = F.global.channels.remove('id', controller.id);
		F.global.refresh && F.global.refresh();

		F.global.users.forEach(function(item) {
			if (item.unread[controller.id])
				delete item.unread[controller.id];
			if (item.channels && item.channels[controller.id])
				delete item.channels[controller.id];
		});

		NOSQL('channel' + controller.id).drop();
		OPERATION('channels.save', NOOP);
		callback(SUCCESS(true));
	});
});