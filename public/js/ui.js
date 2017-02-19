COMPONENT('searchbox', function() {
	var self = this;
	var icon;

	self.noValidate();
	self.make = function() {
		self.classes('search');
		self.html('<span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" data-jc-bind=""{1} /></div>'.format(self.attr('data-placeholder') || '', self.attr('data-enter') === 'true' ? ' data-jc-keypress="false"' : ''));
		icon = self.find('.fa');
		self.event('click', '.fa-times', function() {
			self.set('');
		});
	};

	self.getter2 = self.setter2 = function(value) {
		icon.toggleClass('fa-search', value ? false : true).toggleClass('fa-times', value ? true : false);
	};
});

COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-jc-path'))(self);
	};

	self.make = function() {
		self.event('click', self.click);
		var enter = self.attr('data-enter');
		enter && $(enter).on('keydown', 'input', function(e) {
			e.keyCode === 13 && setTimeout(function() {
				!self.element.get(0).disabled && self.click();
			}, 100);
		});
	};
});

COMPONENT('exec', function() {
	var self = this;
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', self.attr('data-selector') || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.keyCode === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.info = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-info', message, icon || 'fa-check-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.element.removeClass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (self.attr('data-button') || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.text').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('checkbox', function() {

	var self = this;
	var input;
	var isRequired = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;
		value = type === 'undefined' || type === 'object' ? '' : value.toString();
		return value === 'true' || value === 'on';
	};

	self.required = function(value) {
		self.find('span').toggleClass('ui-checkbox-label-required', value === true);
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {
		self.classes('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.event('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		emptyText !== undefined && builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.classes('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(isRequired ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function(path) {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var validation = self.attr('data-validate');
	var input;
	var container;

	self.validate = function(value) {

		if (input.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return validation ? self.evaluate(value, validation, true) ? true : false : value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-keypress', self.attr('data-jc-keypress'));
		attrs.attr('data-jc-keypress-delay', self.attr('data-jc-keypress-delay'));
		attrs.attr('data-jc-bind', '');
		attrs.attr('name', self.path);

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';
		else if (self.type === 'search') {
			icon2 = 'fa-search ui-textbox-control-icon';
			self.event('click', '.ui-textbox-control-icon', function() {
				self.$stateremoved = false;
				$(this).removeClass('fa-times').addClass('fa-search');
				self.set('');
			});
			self.getter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.event('click', '.fa-caret-up,.fa-caret-down', function(e) {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.event('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.classes('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(isRequired ? ' ui-textbox-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', invalid);
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()).replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);
		recompile && jC.compile();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.append('<ul class="ui-error hidden"></ul>');
		element = self.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		if (NOTMODIFIED(self.id, value))
			return;
		if (!value)
			return self.classes('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
	};
});

COMPONENT('page', function() {
	var self = this;
	var isProcessed = false;
	var isProcessing = false;

	self.readonly();

	self.hide = function() {
		self.set('');
	};

	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;
		var reload = self.attr('data-reload');

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);
			is && reload && self.get(reload)();
			self.release(!is);
			return;
		}

		SETTER('loading', 'show');
		isProcessing = true;

		INJECT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				typeof(fn) === 'function' && fn(self);
			}

			reload && self.get(reload)();
			isProcessed = true;
			setTimeout(function() {
				el.toggleClass('hidden', !is);
			}, 200);
			SETTER('loading', 'hide', 1000);
		});
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };
	self.onHide = function(){};

	var hide = self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();
		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-path="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.path, self.attr('data-title')));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.classes('-hidden');
		self.element = el;

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function(e) {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](hide);
					break;
			}
		});

		enter === 'true' && self.event('keydown', 'input', function(e) {
			e.keyCode === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});
	};

	self.setter = function(value) {

		setTimeout2('noscroll', function() {
			$('html').toggleClass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = !EVALUATE(self.path, self.condition);
		self.toggle('hidden', isHidden);
		EMIT('reflow', self.name);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		var el = self.find('input[type="text"],select,textarea');
		el.length && el.eq(0).focus();

		window.$$form_level++;
		self.css('z-index', window.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').addClass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (window.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var html;
	var template_group;
	var group;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.empty().append(builder);
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var container;
	var data = [];
	var values;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (self.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = self.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.toggle('ui-dropdowncheckbox-container');
		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.event('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];
			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);
			if (is)
				index === -1 && arr.push(value);
			else
				index !== -1 && arr.splice(index, 1);

			self.reset(true);
			self.set(arr, undefined, 2);
			self.change(true);
		});

		var ds = self.attr('data-source');
		if (!ds)
			return;

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		if (NOTMODIFIED(path, value))
			return;

		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;

				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}

				!is && remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			refresh && MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		!label && value && MAN.set(self.path, []);

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function(type) {
		self.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function(e) {
		if (window.$dropdowncheckboxelement) {
			window.$dropdowncheckboxelement.addClass('hidden');
			window.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;
	var timeout;
	var isTyping = false;
	var currentH;
	var maxlength;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.released = function(is) {
		is && editor.setValue('');
	};

	self.getValue = function() {
		var value = editor.getValue();
		return value.length > maxlength ? value.substring(0, maxlength) : value;
	};

	self.codemirror = function() {
		return editor;
	};

	self.focus = function() {
		editor.focus();
		return this;
	};

	self.enter = function() {};
	self.upload = function() {};
	self.typing = function() {};
	self.edit = function() {};
	self.change2 = function() {};

	self.make = function() {

		var height = self.attr('data-height');
		var icon = self.attr('data-icon');
		var content = self.html();
		self.html('<div class="ui-codemirror"></div>');

		var container = self.find('.ui-codemirror');
		maxlength = (self.attr('data-maxlength') || '').parseInt();

		editor = CodeMirror(container.get(0), { lineNumbers: self.attr('data-linenumbers') === 'true', lineWrapping: true, mode: self.attr('data-type') || 'htmlmixed', indentUnit: 4, placeholder: self.attr('data-placeholder'), extraKeys: { 'Enter': function() { return self.enter(0); }, 'Cmd-Enter': function() { return self.enter(1); }, 'Up': function() { if (editor.getValue()) return CodeMirror.Pass; self.edit(true); }, 'Esc': function() { self.edit(false); return CodeMirror.pass; }, 'Ctrl-Enter': function() { return self.enter(1); }}});

		editor.on('dragover', function() {
			self.element.addClass('ui-codemirror-dragdrop');
		});

		editor.on('dragleave', function() {
			self.element.removeClass('ui-codemirror-dragdrop');
		});

		editor.on('drop', function(editor, e) {
			self.element.removeClass('ui-codemirror-dragdrop');
			self.upload(editor, e);
		});

		maxlength && editor.setOption('maxlength', maxlength);

		editor.on('update', function() {
			var h = editor.getScrollerElement().clientHeight;
			if (currentH !== h) {
				currentH = h;
				EMIT('resize');
			}
		});

		editor.on('keypress', function() {
			if (isTyping) {
				setTimeout2(self.id + 'typing', function() {
					isTyping = false;
				}, 5000);
				return;
			}
			isTyping = true;
			self.typing();
		});

		height !== 'auto' && editor.setSize('100%', height || '100px');

		editor.on('change', function(a, b) {

			if (self.release())
				return;

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				var val = editor.getValue();
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(val);
				CACHE('codemirror.' + NAVIGATION.url, val, '7 days');
			}, 200);
		});

		editor.on('beforeChange', function(cm, change) {
			var maxlength = cm.getOption('maxlength');
			if (maxlength && change.update) {
				var str = change.text.join('\n');
				var delta = str.length-(cm.indexFromPos(change.to) - cm.indexFromPos(change.from));
				if (delta <= 0)
					return true;
				delta = cm.getValue().length + delta - maxlength;
				if (delta) {
					str = str.substr(0, str.length - delta);
					change.update(change.from, change.to, str.split('\n'));
				}
			}
		});

		skipB = true;
	};

	self.reload = function() {
		var val = CACHE('codemirror.' + NAVIGATION.url) || '';
		setTimeout2(self.id, function() {
			self.set(val);
		}, 500);
	};

	self.setter = function(value, path, type) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		type && CACHE('codemirror.' + NAVIGATION.url, value, '7 days');
		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		var f = editor.getCursor(true);
		var t = editor.getCursor(false);
		skipB = true;
		editor.setValue(editor.getValue());
		editor.setCursor(editor.lineCount(), 0);
		skipB = true;

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);
	};

	self.state = function(type) {
		self.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.classes('-ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		visible = true;
		self.find('.ui-confirm-body').empty().append(text);
		self.classes('-hidden');
		setTimeout2(self.id, function() {
			self.classes('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.classes('-hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.classes('+hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('search', function() {

	var self = this;
	var options_class;
	var options_selector;
	var options_attribute;
	var options_delay;

	self.readonly();
	self.make = function() {
		options_class = self.attr('data-class') || 'hidden';
		options_selector = self.attr('data-selector');
		options_attribute = self.attr('data-attribute') || 'data-search';
		options_delay = (self.attr('data-delay') || '200').parseInt();
	};

	self.setter = function(value, path, type) {

		if (!options_selector || !options_attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toLowerCase().toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.toggleClass(options_class, true);
				});

				show.forEach(function(item) {
					item.toggleClass(options_class, false);
				});
			});

		}, options_delay, 'search' + self.id);
	};
});

COMPONENT('binder', function() {

	var self = this;
	var keys;
	var keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path, value) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.toggleClass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.removeClass(rem);
		add && element.addClass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? FN(decode(classes)) : undefined;
				obj.html = html ? FN(decode(html)) : undefined;
				obj.visible = visible ? FN(decode(visible)) : undefined;

				var tmp = el.find('script[type="text/html"]');
				var str = '';
				if (tmp.length)
					str = tmp.html();
				else
					str = el.html();

				if (str.indexOf('{{') !== -1) {
					obj.template = Tangular.compile(str);
					tmp.length && tmp.remove();
				}

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}

		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};

});

COMPONENT('websocket', function() {

	var reconnect_timeout;
	var self = this;
	var ws;
	var url;

	self.online = false;
	self.readonly();
	self.blind();

	self.make = function() {
		reconnect_timeout = (self.attr('data-reconnect') || '5000').parseInt();
		url = self.attr('data-url');
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		ws && ws.send(encodeURIComponent(JSON.stringify(obj)));
		return self;
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		SETTER('loading', 'show');
		self.online = false;
		EMIT('online', false);
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		return self;
	};

	function onClose(e) {
		self.close(true);
		setTimeout(function() {
			self.connect();
		}, reconnect_timeout);
	}

	function onMessage(e) {
		try {
			self.message(JSON.parse(decodeURIComponent(e.data)));
		} catch (e) {
			window.console && console.warn('WebSocket "{0}": {1}'.format(url, e.toString()));
		};
	}

	function onOpen(e) {
		SETTER('loading', 'hide', 500);
		self.online = true;
		EMIT('online', true);
	}

	self.connect = function() {
		ws && self.close();
		timeout = setTimeout(function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('typing', function() {
	var self = this;
	var cache = {};
	var empty = true;
	var count = 0;
	var max;

	self.readonly();

	self.make = function() {

		max = (self.attr('data-max') || '4').parseInt();

		self.classes('ui-typing');
		var scr = self.find('script');
		self.template = Tangular.compile(scr.html());
		scr.remove();
		setInterval(function() {
			if (empty)
				return;
			var dt = new Date();
			Object.keys(cache).forEach(function(id) {
				if (cache[id] > dt)
					return;
				delete cache[id];
				count--;
				self.find('div[data-id="{0}"]'.format(id)).remove();
			});
		}, 5000);
	};

	self.clear = function() {
		count = 0;
		cache = {};
		self.empty();
	};

	self.insert = function(user) {
		if (count > max)
			return;
		var is = cache[user.id] ? true : false;
		cache[user.id] = new Date().add('5 seconds');
		empty = false;
		count++;
		!is && self.append(self.template(user));
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	var reload = self.attr('data-reload');

	self.readonly();
	self.setter = function(value) {

		if (!self.evaluate(self.attr('data-if')))
			return;

		if (imported) {
			if (reload)
				return EXEC(reload);
			self.setter = null;
			return;
		}

		imported = true;
		IMPORT(self.attr('data-url'), function() {
			if (reload)
				return EXEC(reload);
			self.remove();
		});
	};
});

COMPONENT('audio', function() {
	var self = this;
	var can = false;
	var volume = 0.5;
	var cache = {};

	self.items = [];
	self.readonly();
	self.singleton();

	self.make = function() {
		var audio = document.createElement('audio');
		if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
			can = true;
	};

	self.play = function(url) {

		if (!can || cache[url])
			return;

		var audio = new window.Audio();

		audio.src = url;
		audio.volume = volume;
		audio.play();
		cache[url] = true;

		audio.onended = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		audio.onerror = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		audio.onabort = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		self.items.push(audio);
		return self;
	};

	self.cleaner = function() {
		var index = 0;
		while (true) {
			var item = self.items[index++];
			if (item === undefined)
				return self;
			if (!item.$destroy)
				continue;
			item.pause();
			item.onended = null;
			item.onerror = null;
			item.onsuspend = null;
			item.onabort = null;
			item = null;
			index--;
			self.items.splice(index, 1);
		}
		return self;
	};

	self.stop = function(url) {

		delete cache[url];

		if (!url) {
			self.items.forEach(function(item) {
				item.$destroy = true;
			});
			return self.cleaner();
		}

		var index = self.items.findIndex('src', url);
		if (index === -1)
			return self;
		self.items[index].$destroy = true;
		return self.cleaner();
	};

	self.setter = function(value) {

		if (value === undefined)
			value = 0.5;
		else
			value = (value / 100);

		if (value > 1)
			value = 1;
		else if (value < 0)
			value = 0;

		volume = value ? +value : 0;
		for (var i = 0, length = self.items.length; i < length; i++) {
			var a = self.items[i];
			if (!a.$destroy)
				a.volume = value;
		}
	};
});

COMPONENT('pictureupload', function() {

	var self = this;
	var width = +self.attr('data-width');
	var height = +self.attr('data-height');
	var url = self.attr('data-url') || location.pathname;
	var empty;
	var img;

	self.noValidate();

	self.make = function() {

		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		var bg = self.attr('data-background');
		if (bg) {
			var ctx = canvas.getContext('2d');
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, width, height);
		}

		empty = canvas.toDataURL('image/png');
		canvas = null;

		var html = self.html();
		var icon = self.attr('data-icon');
		self.toggle('ui-pictureupload');
		self.html((html ? '<div class="ui-pictureupload-label">{0}{1}:</div>'.format(icon ? '<i class="fa {0}"></i>'.format(icon) : '', html) : '') + '<input type="file" accept="image/*" class="hidden" /><img src="{0}" class="img-responsive" alt="" />'.format(empty, width, height));

		img = self.find('img');

		img.on('click', function() {
			self.find('input').trigger('click');
		});

		self.event('change', 'input', function(evt) {
			self.upload(evt.target.files);
		});

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					break;
				case 'dragenter':
				case 'dragover':
					return;
				case 'dragexit':
				case 'dragleave':
				default:
					return;
			}

			self.upload(e.originalEvent.dataTransfer.files);
		});
	};

	self.upload = function(files) {

		if (!files.length)
			return;

		var el = this;
		var data = new FormData();
		data.append('file', files[0]);
		data.set('width', width);
		data.set('height', height);

		UPLOAD(url, data, function(response, err) {

			SETTER('loading', 'hide', 100);

			if (err) {
				SETTER('message', 'warning', self.attr('data-error-large'));
				return;
			}

			el.value = '';
			self.set(response, undefined, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {
		if (value)
			img.attr('src', (self.attr('data-path') || '{0}').format(value));
		else
			img.attr('src', empty);
	};
});

COMPONENT('nativenotifications', function() {
	var self = this;
	var autoclosing;
	var system = false;
	var N = window.Notification;

	self.singleton();
	self.readonly();
	self.items = [];

	self.make = function() {
		if (!N)
			return;
		system = N.permission === 'granted';
		!system && N.requestPermission(function (permission) {
			system = permission === 'granted';
		});
	};

	self.append = function(title, message, callback, img) {

		if (!system || !self.get())
			return;

		var obj = { id: Math.floor(Math.random() * 100000), date: new Date(), callback: callback };
		var options = {};

		options.body = message.replace(/(<([^>]+)>)/ig, '');
		self.items.push(obj);

		self.autoclose();

		if (img === undefined)
			options.icon = '/icon.png';
		else if (img != null)
			options.icon = img;

		obj.system = new N(title, options);
		obj.system.onclick = function() {

			window.focus();
			self.items = self.items.remove('id', obj.id);

			if (obj.callback) {
				obj.callback();
				obj.callback = null;
			}

			obj.system.close();
			obj.system.onclick = null;
			obj.system = null;
		};
	};

	self.autoclose = function() {

		if (autoclosing)
			return self;

		autoclosing = setTimeout(function() {
			clearTimeout(autoclosing);
			autoclosing = null;
			var obj = self.items.shift();
			if (obj) {
				obj.system.onclick = null;
				obj.system.close();
				obj.system = null;
			}
			self.items.length && self.autoclose();
		}, +self.attr('data-timeout') || 8000);
	};
});

COMPONENT('clipboardimage', function() {

	var self = this;
	var ctx, img, canvas, maxW, maxH, quality;

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.classes('hidden');
		self.append('<canvas></canvas><img src="data:image/png;base64,R0lGODdhAQABAIAAAHnrWAAAACH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==" />');
		canvas = self.find('canvas').get(0);
		ctx = canvas.getContext('2d');
		img = self.find('img').get(0);
		maxW = (self.attr('data-width') || '1280').parseInt();
		maxH = (self.attr('data-height') || '1024').parseInt();
		quality = (self.attr('data-quality') || '90').parseInt() * 0.01;

		$(window).on('paste', function(e) {
			var item = e.originalEvent.clipboardData.items[0];
			if (item.kind !== 'file' || item.type.substring(0, 5) !== 'image')
				return;
			var blob = item.getAsFile();
			var reader = new FileReader();
			reader.onload = function(e) {
				img.onload = function() {
					self.resize();
				};
				img.src = e.target.result;
			};
			reader.readAsDataURL(blob);
		});
	};

	self.resize = function() {
		var dpr = window.devicePixelRatio;

		if (dpr > 1) {
			canvas.width = img.width / dpr;
			canvas.height = img.height / dpr;
		} else {
			canvas.width = img.width;
			canvas.height = img.height;
		}

		if (canvas.width > maxW) {
			canvas.width = maxW;
			canvas.height = (img.width / (img.width / img.height)) >> 0;
		} else if (canvas.height > maxH) {
			canvas.height = maxH;
			canvas.width = (img.height / (img.width / img.height)) >> 0;
		}

		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		EMIT('clipboardimage', canvas.toDataURL('image/jpeg', quality));
	};
});

jC.parser(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value;

		if (!value)
			return null;

		var isEN = value.indexOf('.') === -1;
		var tmp = isEN ? value.split('-') : value.split('.');
		if (tmp.length !== 3)
			return null;
		var dt = isEN ? new Date(parseInt(tmp[0]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[2], 10) || 0) : new Date(parseInt(tmp[2]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[0], 10) || 0);
		return dt;
	}

	return value;
});

jC.formatter(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value.format(this.attr('data-jc-format'));
		return value ? new Date(Date.parse(value)).format(this.attr('data-jc-format')) : value;
	}

	if (type !== 'currency')
		return value;

	if (typeof(value) !== 'number') {
		value = parseFloat(value);
		if (isNaN(value))
			value = 0;
	}

	return value.format(2);
});

