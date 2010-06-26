/**
 * This file is a part of MediaCore, Copyright 2009 Simple Station Inc.
 *
 * MediaCore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MediaCore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
String.implement({

	slugify: function(){
		return this.toString().trim().tidy().standardize().toLowerCase()
			.replace(/\s+/g,'-')
			.replace(/&(\#x?[0-9a-f]{2,6}|[a-z]{2,10});/g, '') // strip xhtml entities, they should be entered as unicode anyway
			.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue') // some common german chars
			.replace(/[^a-z0-9\-]/g,'');
	}

});

/**
 * <form> property that can get or set a hash of values.
 *
 * XXX: Element IDs should match field names, but only for checkbox/radio lists is this required.
 *      Add a prefix for all IDs by: $('my-form').store('fieldPrefix', 'my-form-')
 *      You can always avoid all this by calling Element.get('fieldValue') directly on your fields.
 *
 * @author Nathan Wright <nathan@simplestation.com>
 */
Element.Properties.formValues = {

	set: function(values){
		var prefix = this.retrieve('fieldPrefix', '');
		new Hash(values).each(function(value, name){
			var el = this.getElementById(prefix + name);
			if (!el) el = this.elements[name];
			if (!el || $type(el) == 'collection') Log.log('No ' + name + ' element to set the response value to', value);
			el.set('fieldValue', value);
		}, this);
	},

	get: function(){
		var values = new Hash();
		var fields = new Hash();
		var prefix = this.retrieve('fieldPrefix', '');
		for (var el, i = 0, l = this.elements.length; i < l; i++) {
			el = this.elements[i];
			if (!fields[el.name]) fields[el.name] = 1;
		}
		fields.each(function(a, name){
			var el = this.getElementById(prefix + name);
			if (!el) el = this.elements[name];
			if (!el || $type(el) == 'collection') return Log.log('No field element with id ' + prefix + name, this);
			var value = $(el).get('fieldValue');
			if (value == undefined) return;
			values[name] = value;
		}, this);
		return values;
	}

};

/**
 * Override Hash.toQueryString to make it work the same as Element.toQueryString when possible.
 * IE: {a: [1,2,3]} should be "a=1&a=2&a=3" not "a[0]=1&a[1]=2&a[2]=3"
 */
Class.refactor(Hash, {

	toQueryString: function(base){
		var queryString = [];
		Hash.each(this, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result = [];
			switch ($type(value)) {
				case 'object': result = [Hash.toQueryString(value, key)]; break;
				case 'array':
					var containsComplexTypes = value.some(function(val){ return ['object', 'array'].contains($type(val)); });
					if (containsComplexTypes) {
						var qs = {};
						value.each(function(val, i){
							qs[i] = val;
						});
						result = [Hash.toQueryString(qs, key)];
					} else {
						value.each(function(val){
							if (typeof val != 'undefined') result.push(key + '=' + encodeURIComponent(val));
						});
					}
					break;
				default: result = [key + '=' + encodeURIComponent(value)];
			}
			if (value != undefined) queryString.extend(result);
		});
		return queryString.join('&');
	}

});

/**
 * <input/textarea/select> and <ul/ol> checkbox/radio value property.
 * Gets and sets scalar and list values, depending on the field type.
 *
 * @author Nathan Wright <nathan@simplestation.com>
 */
(function(){
Element.Properties.fieldValue = {

	set: function(value){
		var tag = this.get('tag');
		if (tag == 'input') {
			if (this.type == 'checkbox' || this.type == 'radio') this.checked = !!value;
			else this.value = value;
		} else if (tag == 'textarea') {
			if (this.hasClass('tinymcearea')) tinyMCE.get(this.name).setContent(value || '');
			this.value = value;
		} else if (tag == 'select') {
			if (this.multiple) _setChildren(this, 'option', 'selected', value);
			else this.value = value;
		} else if (tag == 'ul' || tag == 'ol') {
			_setChildren(this, 'input', 'checked', value);
		}
	},

	get: function(){
		if (this.disabled) return;
		var tag = this.get('tag');
		if (tag == 'input') {
			if (this.type == 'checkbox' || this.type == 'radio') {
				return this.checked ? this.value : null;
			} else if (this.type != 'submit' && this.type != 'reset' && this.type != 'file') {
				return this.value;
			}
		} else if (tag == 'textarea') {
			if (this.hasClass('tinymcearea')) return tinyMCE.get(this.name).getContent();
			return this.value;
		} else if (tag == 'select') {
			if (this.multiple) return _getChildren(this, 'option', 'selected');
			return this.value;
		} else if (tag == 'ul' || tag == 'ol') {
			return _getChildren(this, 'input', 'checked');
		}
	}

};

// private helpers for fieldValue
var _setChildren = function(el, tag, prop, value){
	value = $splat(value);
	el.getElements(tag + '[' + prop + ']').set(prop, false);
	for (var i = 0, l = value.length; i < l; i++) {
		el.getElements(tag + '[value="' + value[i] + '"]').set(prop, true);
	}
}, _getChildren = function(el, tag, prop){
	return child = el.getElements(tag + '[' + prop + ']').map(function(opt){
		return opt.value;
	});
};

})();

var BoxForm = new Class({

	Implements: [Options, Events],

	options: {
	/*	onSave: function(values){},
		onSaveSuccess: function(json){},
		onSaveError: function(json){}, */
		save: {link: 'cancel'},
		spinner: {
			'class': 'f-rgt form-saving',
			text: 'Saving...'
		},
		success: {
			'class': 'f-rgt form-saved',
			text: 'Saved!'
		},
		error: {
			'class': 'f-rgt form-save-error',
			text: 'Please correct the highlighted errors and save again.'
		},
		slug: {
			slugify: 'title'
		}
	},

	initialize: function(form, opts){
		this.setOptions(opts);
		this.form = $(form).store('BoxForm', this)
			.addEvent('submit', this.save.bind(this));
		if (this.options.slug && this.form.elements['slug']) {
			this.slug = new BoxForm.Slug(this.form.elements['slug'], this.options.slug);
		}
	},

	save: function(e){
		e = new Event(e).preventDefault();
		this.injectSpinner();
		if (!this.request) this.request = new Request.JSON(this.options.save).addEvents({
			success: this.saved.bind(this),
			failure: function(){ alert('Saving failed. Please try again.'); }
		});
		var values = this.form.get('formValues');
		this.request.send({
			url: this.form.get('action'),
			method: this.form.get('method'),
			data: values
		});
		this.fireEvent('save', [values]);
	},

	saved: function(json){
		this.form.set('formValues', json.values).getElements('span[class=field_error]').destroy();
		if (!json.success) new Hash(json.errors).each(this.injectError, this);
		this.updateSpinner(json.success);
		this.fireEvent('save' + (json.success? 'Success' : 'Error'), json);
	},

	injectError: function(msg, name){
		var label = this.form.getElement('label[for=' + name + ']');
		var el = new Element('span', {'class': 'field_error', text: msg}).inject(label, 'after');
		var field = this.form.getElementById(name).highlight();
	},

	injectSpinner: function(){
		if (this.spinner) this.spinner.destroy();
		this.spinner = new Element('span', this.options.spinner);
		this.form.getElement('.box-foot').adopt(this.spinner);
	},

	updateSpinner: function(success){
		var props = this.options[success ? 'success' : 'error'];
		this.spinner = new Element('span', props).replaces(this.spinner);
		if (success) this.spinner.fade.delay(2000, this.spinner);
	}

});

BoxForm.Slug = new Class({

	Implements: Options,

	Binds: ['slugify'],

	options: {
		slugify: '',
		slugifyOn: 'change'
	},

	initialize: function(el, opts){
		this.field = $(el);
		this.container = this.field.getParent('li');
		this.label = this.container.getElement('div.form_label');
		this.indicator = new Element('span', {'class': 'slug-indicator'})
			.inject(this.label, 'bottom');
		this.label.appendText(' ');
		this.toggleButton = new Element('span', {text: 'Hide', 'class': 'slug-toggle link'})
			.inject(this.label, 'bottom')
			.addEvent('click', this.toggle.bind(this));
		this.setOptions(opts);
		if (this.options.slugify) this.attachSlugifier();
		this.show(false);
	},

	attachSlugifier: function(){
		$(this.options.slugify).addEvent(this.options.slugifyOn, this.slugify);
		return this;
	},

	detachSlugifier: function(){
		$(this.options.slugify).removeEvent(this.options.slugifyOn, this.slugify);
		return this;
	},

	show: function(flag){
		if (flag) {
			this.container.removeClass('slug-minimized').addClass('slug-expanded');
			this.field.set('type', 'text').select();
			this.toggleButton.set('text', 'Hide');
		} else {
			this.container.addClass('slug-minimized').removeClass('slug-expanded');
			this.field.set('type', 'hidden');
			this.indicator.set('text', this.field.get('value'));
			this.toggleButton.set('text', 'Edit');
		}
		this.shown = !!flag;
		return this;
	},

	toggle: function(){
		return this.show(!this.shown);
	},

	slugify: function(e){
		var target = $(new Event(e).target);
		return this.setSlug(target.get('value').slugify());
	},

	setSlug: function(slug){
		this.field.value = slug;
		this.indicator.set('text', slug);
		return this;
	}

});