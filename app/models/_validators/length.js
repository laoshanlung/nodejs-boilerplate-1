var _ = require('underscore')
  , _s = require('underscore.string')
  , validator = require('validator')
  , when = require('when')

module.exports = function(value, attribute, params) {
  var self = this;
  params.attribute = this.getLabel(attribute);

  var message = this.i18n().gettext("%(attribute)s must be between %(min)d and %(max)d characters", params);

  if (params.min && !params.max) {
    message = this.i18n().gettext('%(attribute)s must be greater than %(min)s characters', params);
  } else if (params.max && !params.min) {
    message = this.i18n().gettext('%(attribute)s must be less than %(max)s characters', params);
  }

  if (validator.isLength(value, params.min, params.max)) {
    return null;
  }

  return message;
}