exports.install = function() {

	F.route('/api/login/', json_exec, ['*Login', 'post', 'unauthorize']);

	F.group(['authorize'], function() {
		// Common
		F.route('/logoff/', logoff);

		// Uploads
		F.route('/api/upload/',         upload,       ['upload', 10000], 3084); // 3 MB
		F.route('/api/upload/photo/',   upload_photo, ['upload', 10000], 1024); // 1 MB

		// Users
		F.route('/api/account/',        json_save,    ['*Account', 'post']);

		// Channels (SA)
		F.route('/api/channels/',       json_save,    ['*Channel', 'post']);
		F.route('/api/channels/{id}/',  json_remove,  ['*Channel', 'delete']);

		// Messages
		F.route('/api/messages/{id}/',  json_query,   ['*Message']);

		// Tasks
		F.route('/api/tasks/',          json_query,   ['*Task']);
		F.route('/api/tasks/',          json_save,    ['*Task', 'post']);
		F.route('/api/tasks/{id}/',     json_exec,    ['*Task']);

		// Users (SA)
		F.route('/api/users/',          json_query,   ['*User']);
		F.route('/api/users/',          json_save,    ['*User', 'post']);
		F.route('/api/users/{id}/',     json_read,    ['*User']);
		F.route('/api/users/{id}/',     json_remove,  ['*User', 'delete']);
	});

	F.file('/download/', file_read);
};

function file_read(req, res) {

	var id = req.split[1].replace('.' + req.extension, '');

	F.exists(req, res, function(next, filename) {
		NOSQL('files').counter.hit('read');
		NOSQL('files').binary.read(id, function(err, stream, header) {

			if (err) {
				next();
				return res.throw404();
			}

			var writer = require('fs').createWriteStream(filename);

			CLEANUP(writer, function() {
				res.file(filename, header.name);
				next();
			});

			stream.pipe(writer);
		});
	});
}

function upload() {

	var self = this;
	var id = [];

	self.files.wait(function(file, next) {
		file.read(function(err, data) {

			// Store current file into the HDD
			file.extension = U.getExtension(file.filename);
			var filename = NOSQL('files').binary.insert(file.filename, data) + '.' + file.extension;
			id.push({ url: '/download/' + filename, filename: file.filename, width: file.width, height: file.height });
			NOSQL('files').counter.hit('write');

			// Next file
			setTimeout(next, 100);
		});

	}, () => self.json(id));
}

function upload_photo() {
	var self = this;
	var file = self.files[0];

	if (file.isImage()) {
		var id = Date.now().toString();
		file.image().make(function(builder) {
			builder.resizeAlign(150, 150, 'center');
			builder.quality(95);
			builder.save(F.path.public('/photos/{0}.jpg'.format(id)), () => self.json(id));
		});
	} else
		self.invalid().push('error-user-photo');
}

function json_query(id) {
	this.id = id;
	this.$query(this.callback());
}

function json_read(id) {
	this.id = id;
	this.$read(this.callback());
}

function json_save(id) {
	this.id = id;
	this.$save(this.callback());
}

function json_remove(id) {
	this.id = id;
	this.$remove(this.callback());
}

function json_exec(id) {
	this.id = id;
	this.$workflow('exec', this.callback());
}

function logoff() {
	this.cookie(F.config.cookie, '', '-1 day');
	this.redirect('/');
}