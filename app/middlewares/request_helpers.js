var translations = requireFromRoot('translations')
  , _ = require('underscore')

module.exports = function(options) {
  return function(req, res, next) {
    req._internal_data = req._internal_data || {};
    req.setInternalData = function(name, value){
      req._internal_data[name] = value;
      return req;
    }

    req.getQuery = function() {
      return _.clone(req.query);
    }

    req.getBody = function() {
      return _.clone(req.body);
    }

    req.getParams = function() {
      return _.clone(req.params);
    }

    req.getInternalData = function(name, defaultValue) {
      return req._internal_data[name] || defaultValue;
    }

    req.clearInternalData = function() {
      req._internal_data = {};
    }

    req.login = function(id) {
      if (id) {
        req.session['u'] = id;
      }
    }

    req.getUserId = function(id) {
      return req.session['u'];
    }

    req.logout = function() {
      req.session = null;
      req._internal_data = null;
    }

    // auto detect user language here
    req.i18n = function() {
      return translations.getInstance('en');
    }

    next();
  }
}