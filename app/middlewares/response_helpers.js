var _ = require('underscore')
  , Backbone = require('backbone')

module.exports = function(options) {
  return function(req, res, next) {
    res.locals.flashMessages = {};
    
    res.jsonData = function(options) {
      options = options || {};
      options = _.defaults(options, {
        exclude: []
      });

      if (req.query.exclude) {
        var getExclude = req.query.exclude.split(',');
        options.exclude = _.union(options.exclude, getExclude);
      }

      if (req.body.exclude) {
        options.exclude = _.union(options.exclude, req.body.exclude); 
      }

      options.exclude = _.unique(options.exclude);
      return function(data, pagination) {
        if (!_.isObject(data)) {
          if (data instanceof Backbone.Model || data instanceof Backbone.Collection) {
            data = data.toJSON();
          } else {
            data = JSON.parse(data); // just let error happen here, we only allow JSON data passed through
          }
        }

        _.each(options.exclude, function(attribute){
          delete data[attribute];
        });

        var json = {data: data, success: true, error: null};
        if (pagination) {
          json['pagination'] = pagination;
        }

        res.json(json);
      }
    }

    res.jsonError = function(options) {
      options = options || {};

      return function(error) {
        if (error instanceof Error) {
          console.log(error.stack);
          error = error.toString();
        }

        if (error instanceof ApplicationException) {
          var i18n = req.i18n();

          var version = req.getInternalData('apiVersion') || 1;
          version = parseInt(version);

          switch(error.code) {
            case 500:
              // log this later
              delete error.params;
              break;
            case 40000:
              break;
            default:
              break;
          }
          
          if (error.params && error.params.description) {
            error.params.description = i18n.gettext(error.params.description);
          }

          var httpCode = error.httpCode;

          error = _.pick(error, 'code', 'params', 'message');

          res.status(httpCode).json({error: error, success: false, data: null});
        } else {
          res.status(400).json({error: error, success: false, data: null});  
        }
      }
    }

    next();
  }
}