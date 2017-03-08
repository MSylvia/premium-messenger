const MSG_ONOFF = { type: 'online' };
const MSG_CDL = { type: 'cdl' };
const MSG_UNREAD = { type: 'unread' };
const MSG_TYPING = { type: 'typing' };
const SKIPFIELDS = { email: true, unread: true, recent: true, channels: true, password: true, ticks: true };

exports.install = function() {
	F.websocket('/', messages, ['json', 'authorize'], 3);
};

function messages() {

	var self = this;

	self.autodestroy(function() {
		F.global.refresh = null;
	});

	// Temporary method for refreshing data
	F.global.refresh = function() {
		MSG_CDL.channels = F.global.channels;
		MSG_CDL.users = F.global.users;
		var is = true;
		self.send(MSG_CDL, undefined, undefined, function(key, value) {
			if (is && key === 'channels') {
				is = false;
				return value;
			}
			return SKIPFIELDS[key] ? undefined : value;
		});
		F.emit('messenger.refresh', self);
	};

	self.on('open', function(client) {
		var is = true;
		client.user.online = true;
		client.user.datelogged = F.datetime;
		client.user.mobile = client.req.mobile;
		MSG_CDL.channels = F.global.channels;
		MSG_CDL.users = F.global.users;

		client.send(MSG_CDL, undefined, function(key, value) {
			if (is && key === 'channels') {
				is = false;
				return value;
			}
			return SKIPFIELDS[key] ? undefined : value;
		});

		setTimeout(function() {
			MSG_ONOFF.id = client.user.id;
			MSG_ONOFF.online = true;
			MSG_ONOFF.datelogged = F.datetime;
			self.send(MSG_ONOFF);
		}, 500);

		F.emit('messenger.online', self, client);
	});

	self.on('close', function(client) {
		if (self.find(n => n.user.id === client.user.id && n.id !== client.id))
			return;
		client.user.online = false;
		MSG_ONOFF.id = client.user.id;
		MSG_ONOFF.online = false;
		MSG_ONOFF.datelogged = F.datetime;
		self.send(MSG_ONOFF);
		F.emit('messenger.close', self, client);
	});

	self.on('message', function(client, message) {

		var tmp, iduser, idchannel, is;
		iduser = client.user.id;

		F.emit('messenger.message', self, client, message);

		switch (message.type) {

			case 'unread':
				MSG_UNREAD.unread = client.user.unread;
				MSG_UNREAD.lastmessages = client.user.lastmessages;
				MSG_UNREAD.recent = undefined;
				client.send(MSG_UNREAD);
				break;

			// Changed group (outside of channels and users)
			case 'nochat':
				client.threadtype = undefined;
				client.threadid = undefined;
				break;

			// Changed group
			case 'channel':
			case 'user':
				client.user.threadtype = client.threadtype = message.type;
				client.user.threadid = client.threadid = message.id;
				message.type === 'user' && iduser !== message.id && (client.user.recent[message.id] = true);
				client.user.unread[message.id] && (delete client.user.unread[message.id]);
				break;

			case 'recent':
				delete client.user.recent[message.id];
				OPERATION('users.save', NOOP);
				break;

			// Starts typing
			case 'typing':
				MSG_TYPING.id = iduser;
				self.send(MSG_TYPING, (id, m) => m.user !== client.user && ((m.user.id === client.threadid && m.threadid === iduser) || (client.threadtype === 'channel' && m.threadtype === client.threadtype && m.threadid === client.threadid)));
				break;

			// Real message
			case 'message':

				if (!client.threadid || !client.threadtype)
					return;

				var id = message.id;
				message.id = id ? id : UID();
				message.datecreated = new Date();
				message.iduser = iduser;
				message.mobile = client.req.mobile;
				id && (message.edited = true);
				client.user.lastmessages[client.threadid] = message.id;

				NOSQL('messages').counter.hit('all').hit(iduser);
				// threadtype = "user" (direct message) or "channel"

				if (client.threadtype === 'user') {

					is = true;

					// Users can be logged from multiple devices
					self.send(message, function(id, n) {

						if (n === client)
							return false;

						// Target user
						if (n.threadid === iduser && n.user.id === client.threadid) {
							is = false;
							n.user.lastmessages[n.threadid] = message.id;
							return true;
						}

						return n.user.id === iduser && n.threadid === client.threadid;
					});

					if (is) {
						tmp = F.global.users.findItem('id', client.threadid);
						if (tmp) {

							if (tmp.unread[iduser])
								tmp.unread[iduser]++;
							else
								tmp.unread[iduser] = 1;

							tmp.recent[iduser] = true;

							if (tmp.online) {
								MSG_UNREAD.unread = tmp.unread;
								MSG_UNREAD.recent = tmp.recent;
								MSG_UNREAD.lastmessages = tmp.lastmessages;
								tmp = self.find(n => n.user.id === tmp.id);
								tmp && tmp.send(MSG_UNREAD);
							}

							OPERATION('users.save', NOOP);
						}
					}

					client.send(message);
				} else {

					tmp = {};
					idchannel = client.threadid;

					// Notify users in this channel
					self.send(message, function(id, m) {
						if (m.threadid === client.threadid && (!message.users || message.users[m.user.id])) {
							tmp[m.user.id] = true;
							m.user.lastmessages[m.threadid] = message.id;
							return true;
						}
					});

					// Set "unread" for users outside of this channel
					for (var i = 0, length = F.global.users.length; i < length; i++) {
						var user = F.global.users[i];
						if (!tmp[user.id] && (!user.channels || user.channels[idchannel]) && (!message.users || message.users[user.id])) {
							if (user.unread[idchannel])
								user.unread[idchannel]++;
							else
								user.unread[idchannel] = 1;
						}
					}

					self.all(function(m) {
						if (m.user.id !== iduser && m.threadid !== client.threadid && (!m.user.channels || m.user.channels[client.threadid]) && (!message.users || message.users[m.user.id])) {
							MSG_UNREAD.unread = m.user.unread;
							MSG_UNREAD.lastmessages = m.user.lastmessages;
							MSG_UNREAD.recent = undefined;
							m.send(MSG_UNREAD);
						}
					});

					OPERATION('users.save', NOOP);
				}

				// Saves message into the DB
				var dbname = client.threadtype === 'channel' ? client.threadtype + client.threadid : 'user' + F.global.merge(client.threadid, iduser);
				message.type = undefined;
				message.idowner = client.threadid;
				message.search = message.body.keywords(true, true).join(' ');

				var db = NOSQL(dbname);
				var dbBackup = NOSQL(dbname + '-backup');

				if (id) {
					// Edited
					db.modify({ body: message.body, edited: true, dateupdated: message.datecreated }).where('id', id).where('iduser', iduser);
					dbBackup.modify({ body: message.body, edited: true, dateupdated: message.datecreated }).where('id', id).where('iduser', iduser);
				} else {

					// New
					if (message.body === ':thumbs-up:')
						db.meta('likes', (db.meta('likes') || 0) + 1);
					else
						db.meta('likes', 0);

					db.insert(message);
					db.counter.hit('all').hit(client.user.id);
					dbBackup.insert(message);
					message.files && message.files.length && NOSQL(dbname + '-files').insert(message);
					OPERATION('messages.cleaner', dbname, NOOP);
				}

				break;

		}
	});
}