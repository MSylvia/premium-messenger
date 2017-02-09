marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

$(document).ready(function() {
	setTimeout(function() {
		EMIT('resize');
	}, 100);
});

ON('ready', function() {
	SETTER('loading', 'hide', 1000);
});

$(window).on('resize', function() {
	EMIT('resize');
});

ON('resize', function() {
	var $w = $(window);
	var width = $w.width();
	var height = $w.height();

	var msgbox = $('#messagebox');
	if (!msgbox.length)
		return;

	if (msgbox.hasClass('hidden'))
		msgbox = 0;
	else
		msgbox = msgbox.height();

	$('#content').css('height', height - $('#header').height() - (msgbox));
	var tmp = $('#panel');
	tmp.css('height', height - tmp.offset().top);
});

function highlight(el) {
	$(el).find('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
}

function scrollBottom() {
	var el = $('#content');
	el.scrollTop(el.get(0).scrollHeight);
}

Tangular.register('markdown', function(value) {
	var str = marked(smilefy(mailify(urlify(value))));
	return str.replace(/&lt;i\sclass=&quot;smiles.*?&lt;\/i&gt;/g, function(text) {
		return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
	}).replace(/<img/g, '<img class="img-responsive"').replace(/<table/g, '<table class="table table-bordered"').replace(/<a\s/g, '<a target="_blank"');
});

function smilefy(str) {

	var builder = [];
	var beg = 0;
	var skip = false;

	for (var i = 0, length = str.length; i < length; i++) {
		var c = String.fromCharCode(str.charCodeAt(i));

		if (c === '`') {
			!skip && builder.push(smilefy2(str.substring(beg, i)));
			skip = !skip;
			!skip && (beg = i + 1);
			builder.push(c);
		} else if (skip)
			builder.push(c);
	}

	var tmp = str.substring(beg, str.length);
	tmp && builder.push(smilefy2(tmp, true));
	return builder.join('');
}

function smilefy2(str, wrap) {
	var db = { ':-)': 1, ':)': 1, ';)': 8, ':D': 0, '8)': 5, ':((': 7, ':(': 3, ':|': 2, ':P': 6, ':O': 4, ':*': 9, '+1': 10, '1': 11, '\/': 12 };
	return str.replace(/(\-1|[:;8O\-)DP(|\*]|\+1){1,3}/g, function(match) {
		var smile = db[match.replace('-', '')];
		return smile === undefined ? match : '<i class="smiles smiles-' + smile + '"></i>';
	});
}

function urlify(str, a) {
	return str.replace(/(((https?:\/\/)|(www\.))[^\s]+)/g, function(url, b, c) {


		// Check the markdown
		var l = url.substring(url.length - 1, url.length);
		var p = url.substring(url.length - 2, url.length - 1);

		if (l === ')' || l === '>' || p === ')' || p === '>')
			return url;

		var len = url.length;
		l = url.substring(len - 1);
		if (l === ')')
			return url;
		if (l === '.' || l === ',')
			url = url.substring(0, len - 1);
		else
			l = '';
		var raw = url;
		url = c === 'www.' ? 'http://' + url : url;
		return (a ? '<a href="{0}" target="_blank">{1}</a>'.format(url, raw) : '[' + raw + '](' + url + ')') + l;
	});
}

function mailify(str, a) {
	return str.replace(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g, function(m, b, c) {
		var len = m.length;
		var l = m.substring(len - 1);
		if (l === '.' || l === ',')
			m = m.substring(0, len - 1);
		else
			l = '';
		return (a ? '<a href="mailto:{0}">{0}</a>'.format(m) : '[' + m + '](mailto:' + m + ')') + l;
	});
}

function findfiles(str) {
	var match = str.match(/\[.*?\]\(\/download\/.*?\)/g);
	if (!match)
		return null;
	var files = [];
	for (var i = 0, length = match.length; i < length; i++) {
		var text = match[i].trim();
		var index = text.indexOf('(');
		var name = text.substring(1, index - 1);
		var url = text.substring(index + 1, text.length - 1);
		files.push({ name: name, url: url });
	}
	return files;
}

Tangular.register('body', function(value) {
	return smilefy2(urlify(mailify(value.replace(/\`.*?\`/g, function(text) {
		return '<code>' + text.replace(/\`/g, '') + '</code>';
	}), true), true));
});

Tangular.register('def', function(value, def) {
	return value === '' || value == null ? def : value;
});

!function(a){"object"==typeof exports&&"object"==typeof module?a(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],a):a(CodeMirror)}(function(a){function b(a){a.state.placeholder&&(a.state.placeholder.parentNode.removeChild(a.state.placeholder),a.state.placeholder=null)}function c(a){b(a);var c=a.state.placeholder=document.createElement("pre");c.style.cssText="height: 0; overflow: visible",c.className="CodeMirror-placeholder";var d=a.getOption("placeholder");"string"==typeof d&&(d=document.createTextNode(d)),c.appendChild(d),a.display.lineSpace.insertBefore(c,a.display.lineSpace.firstChild)}function d(a){f(a)&&c(a)}function e(a){var d=a.getWrapperElement(),e=f(a);d.className=d.className.replace(" CodeMirror-empty","")+(e?" CodeMirror-empty":""),e?c(a):b(a)}function f(a){return 1===a.lineCount()&&""===a.getLine(0)}a.defineOption("placeholder","",function(c,f,g){var h=g&&g!=a.Init;if(f&&!h)c.on("blur",d),c.on("change",e),c.on("swapDoc",e),e(c);else if(!f&&h){c.off("blur",d),c.off("change",e),c.off("swapDoc",e),b(c);var i=c.getWrapperElement();i.className=i.className.replace(" CodeMirror-empty","")}f&&!c.hasFocus()&&d(c)})});