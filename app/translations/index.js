var config = global.app.config
  , Jed = require('jed')

var locales = config.locales;
var jedInstances = {};
var instances = {};

var path = 'translations/locales/%s/LC_MESSAGES/messages.json';

var translate = function(language, text, data) {
  _.each(locales, function(locale){
    var jedInstance = new Jed({
      locale_data: requireFromRoot(_s.sprintf(path, locale.code))
    });

    instances[locale.code] = {
      gettext: function(text, data) {
        var out = jedInstance.gettext(text);
        return Jed.sprintf(out, data);
      },

      ngettext: function(singular, plural, check, data) {
        var out = jedInstance.ngettext(singular, plural, check);
        return Jed.sprintf(out, data);
      }
    }

    jedInstances[locale.code] = jedInstance;
  });
};

var defaultInstance = {
  gettext: function(text, data) {
    return _s.sprintf(text, data);
  },

  ngettext: function(singular, plural, check, data) {
    var text = singular;
    if (check > 1) {
      text = plural;
    }

    return _s.sprintf(text, data);
  }
}

module.exports = {
  getInstance: function(language) {
    if (!instances[language]) {
      return defaultInstance;
    }

    return instances[language];
  }
}