NEWSCHEMA('Message').make(function(schema) {
	schema.setQuery(function(error, options, callback, controller) {

		var id;

		if (controller.id.startsWith('user')) {
			id = controller.id.substring(4);
			controller.id = 'user' + F.global.merge(id, controller.user.id);
		} else
			id = controller.id.substring(7);

		// channel
		if (controller.id[0] === 'c' && controller.user.channels && !controller.user.channels[id]) {
			error.push('error-user-privileges');
			return callback();
		}

		controller.user.unread[id] && (delete controller.user.unread[id]);

		if (controller.query.q) {
			NOSQL(controller.id + '-backup').find().search('search', controller.query.q.keywords(true, true)).page((controller.query.page || 1) - 1, controller.query.max || 15).callback(callback);
			return;
		}

		NOSQL(controller.id).find().sort('datecreated', true).page((controller.query.page || 1) - 1, controller.query.max || 15).callback(function(err, response) {
			// Sets the first message as read message
			if (controller.query.page === 1 && controller.user.threadid && response.length)
				controller.user.lastmessages[controller.user.threadid] = response[0].id;
			callback(response);
		});
	});

	schema.addWorkflow('files', function(error, model, options, callback, controller) {

		var id;

		if (controller.id.startsWith('user')) {
			id = controller.id.substring(4);
			controller.id = 'user' + F.global.merge(id, controller.user.id);
		} else
			id = controller.id.substring(7);

		// channel
		if (controller.id[0] === 'c' && controller.user.channels && !controller.user.channels[id]) {
			error.push('error-user-privileges');
			return callback();
		}

		NOSQL(controller.id + '-files').find().page((controller.query.page || 1) - 1, controller.query.max || 15).sort('datecreated', true).callback(callback);
	});

});