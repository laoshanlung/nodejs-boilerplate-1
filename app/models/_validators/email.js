var _ = require('underscore')
  , _s = require('underscore.string')
  , validator = require('validator')
  , when = require('when')

module.exports = function(value, attribute, params) {
  var self = this;

  var message = this.i18n().gettext("%(value)s is not a valid email", {value: value});

  if (!value) {
    message = this.i18n().gettext("%(attribute)s is required", {attribute: this.getLabel(attribute)});
  }

  if (validator.isEmail(value)) {
    return null;
  }

  return message;
}