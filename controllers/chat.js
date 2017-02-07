const MSG_ONOFF = { type: 'online' };
const MSG_CDL = { type: 'cdl' };
const MSG_UNREAD = { type: 'unread' };
const MSG_TYPING = { type: 'typing' };
const SKIPFIELDS = { email: true, unread: true, recent: true, channels: true, password: true, threadid: true, threadtype: true, ticks: true };

exports.install = function() {
	F.websocket('/', messages, ['json', 'authorize']);
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
			self.send(MSG_ONOFF, null);
		}, 500);
	});

	self.on('close', function(client) {
		client.user.online = false;
		MSG_ONOFF.id = client.user.id;
		MSG_ONOFF.online = false;
		self.send(MSG_ONOFF);
	});

	self.on('message', function(client, message) {

		var tmp, iduser, idchannel;
		iduser = client.user.id;

		switch (message.type) {

			case 'unread':
				MSG_UNREAD.unread = client.user.unread;
				MSG_UNREAD.recent = undefined;
				client.send(MSG_UNREAD);
				break;

			// Changed group (outside of channels and users)
			case 'nochat':
				client.user.threadtype = undefined;
				client.user.threadid = undefined;
				break;

			// Changed group
			case 'channel':
			case 'user':
				client.user.threadtype = message.type;
				client.user.threadid = message.id;
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
				self.send(MSG_TYPING, (id, m) => m.user !== client.user && ((m.user.id === client.user.threadid && m.user.threadid === iduser) || (client.user.threadtype === 'channel' && m.user.threadtype === client.user.threadtype && m.user.threadid === client.user.threadid)));
				break;

			// Real message
			case 'message':

				var id = message.id;
				message.id = id ? id : UID();
				message.datecreated = new Date();
				message.iduser = iduser;
				message.mobile = client.req.mobile;
				id && (message.edited = true);

				NOSQL('messages').counter.hit('all').hit(iduser);

				// threadtype = "user" (direct message) or "channel"

				if (client.user.threadtype === 'user') {
					tmp = self.find(n => n.user.threadid === iduser && n.user.id === client.user.threadid && n.user !== client.user);
					if (tmp)
						tmp.send(message);
					else {
						tmp = F.global.users.findItem('id', client.user.threadid);
						if (tmp) {

							if (tmp.unread[iduser])
								tmp.unread[iduser]++;
							else
								tmp.unread[iduser] = 1;

							tmp.recent[iduser] = true;
							if (tmp.online) {
								MSG_UNREAD.unread = tmp.unread;
								MSG_UNREAD.recent = tmp.recent;
								tmp = self.find(n => n.user.id === tmp.id);
								tmp && tmp.send(MSG_UNREAD);
							}

							OPERATION('users.save', NOOP);
						}
					}

					client.send(message);
				} else {

					tmp = {};
					idchannel = client.user.threadid;

					// Notify users in this channel
					self.send(message, function(id, m) {
						if (m.user.threadid === client.user.threadid) {
							tmp[m.user.id] = true;
							return true;
						}
					});

					// Set an unread for users outside this channel
					for (var i = 0, length = F.global.users.length; i < length; i++) {
						var user = F.global.users[i];
						if (!tmp[user.id] && (user.channels == null || user.channels[idchannel])) {
							if (user.unread[idchannel])
								user.unread[idchannel]++;
							else
								user.unread[idchannel] = 1;
						}
					}

					self.all(function(m) {
						if (m.user.id !== iduser && m.user.threadid !== client.user.threadid && (!m.user.channels || m.user.channels[client.user.threadid])) {
							MSG_UNREAD.unread = m.user.unread;
							MSG_UNREAD.recent = undefined;
							m.send(MSG_UNREAD);
						}
					});

					OPERATION('users.save', NOOP);
				}

				// Saves message into the DB
				var dbname = client.user.threadtype === 'channel' ? client.user.threadtype + client.user.threadid : 'user' + F.global.merge(client.user.threadid, iduser);
				message.type = undefined;
				message.idowner = client.user.threadid;
				message.search = message.body.keywords(true, true).join(' ');

				var db = NOSQL(dbname);
				var dbBackup = NOSQL(dbname + '-backup');

				if (id) {
					// Edited
					db.modify({ body: message.body, edited: true, dateupdated: message.datecreated }).where('id', id).where('iduser', iduser);
					dbBackup.modify({ body: message.body, edited: true, dateupdated: message.datecreated }).where('id', id).where('iduser', iduser);
				} else {
					// New
					db.insert(message);
					db.counter.hit('all').hit(client.user.id);
					dbBackup.insert(message);
					OPERATION('messages.cleaner', dbname, NOOP);
				}

				break;

		}
	});
}