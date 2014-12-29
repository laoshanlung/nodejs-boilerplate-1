var _ = require('underscore')
  , _s = require('underscore.string')
  , when = require('when')

module.exports = function(value, attribute, params) {
  var self = this;

  var message = this.i18n().gettext("%(attribute)s is required", {
    attribute: this.getLabel(attribute)
  });

  if (value) {
    return null;
  }

  return message;
}