[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png?v=2)](https://www.totaljs.com/support/)

# Installation

- __Premium Messenger__ (v1.0.0) needs latest Total.js from NPM `+v2.4.0`
- __License__: [MIT](license.txt)
- [__Live chat with professional support__](https://messenger.totaljs.com)
- [__HelpDesk with professional support__](https://helpdesk.totaljs.com)

## First start

- set up configuration file `/config`
- run `$ node debug.js` (development) or `$ node release.js` (production)
- open `http://127.0.0.1:8000/`
- sign in __user:__ `info@totaljs.com`, __password:__ `123456` (credentials are stored in `/databases/users.json`)

## How do I translate Messenger?

- install Total.js as global module `npm install -g total.js`
- then open Messenger directory `cd messenger`
- then perform this command `totaljs --translate`
- translate translated file `translate.resource`
- and copy the content to `/resources/default.resource`
- run app

## How can I extend messenger independently?

### Server-side

```javascript
F.on('messenger.open', function(controller, client) {
    // open client
});

F.on('messenger.close', function(controller, client) {
    // disconnected client
});

F.on('messenger.message', function(controller, client, message) {
    // message === OBJECT
});
```

### Client-side

```javascript
ON('messager.ready', function() {
    // messenger is ready
});

ON('messenger.message', function(message) {
    // message === OBJECT
});

ON('messenger.send', function(message) {

});

// You can register unlimited count of workflows with same name
WORKFLOW('messenger.render', function(message) {
    // message.message  - instance of retrieved message
    // message.html     - rendered HTML (can be modified)
    
    // Example:
    message.html = message.html.replace(/\,/g, ' --- ');
});

// How to send a message to the server via WebSocket?
SETTER('websocket', 'send', OBJECT);
```

## Contributors

- Peter Širka (author) <petersirka@gmail.com>
- Martin Smola (support)  <smola.martin@gmail.com>

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt
