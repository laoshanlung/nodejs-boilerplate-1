var config = requireFromRoot('config')
  , qs = require('querystring')
  , node = require('when/node')
  , fs = require('fs')
  , parse = require('csv-parse')
  , moment = require('moment')
  , bcrypt = require('bcrypt')

module.exports = {
  absoluteUrl: function(path, params) {
    if (path.charAt(0) != '/') {
      path = '/' + path;
    }

    if (params) {
      params = qs.stringify(params);
      path = path + '?' + params;
    }

    var domain = config.domain;

    return domain.protocol + domain.main + '.' + domain.suffix + path;
  },

  // turns all date params into ISO 8601 format
  filterDateParam: function(date) {
    var m = moment(date);

    if (!m.isValid()) {
      throw new ApplicationException(40001, {description: 'Invalid date'});
    }

    return m.toISOString();
  },

  fs: node.liftAll(fs),

  buildSelect: function(select, options) {
    options = options || {};
    var limit = parseInt(options.limit)
      , offset = parseInt(options.offset);

    if (_.isNumber(limit) && !_.isNaN(limit)) {
      select.limit(limit <= 0 ? 10 : limit);
    }

    if (_.isNumber(offset) && !_.isNaN(offset)) {
      select.offset(offset <= 0 ? 0 : offset);
    }
    

    if (options.order) {
      _.each(options.order, function(value){
        select.order(value[0], value[1] == 'desc' ? false : true);
      });
    }

    if (options.search && options.searchFields) {
      var s = '%' + options.search + '%';
      var queries = [];
      var params = [];
      _.each(options.searchFields, function(field){
        queries.push(field + ' ILIKE ?');
        params.push(s);
      });

      var searchType = options.searchType || 'OR';
      queries = queries.join(' ' + searchType + ' ');
      params.unshift(queries)
      select.where.apply(select, params);
    }

    if (options.in && _.isObject(options.in)) {
      _.each(options.in, function(value, key){
        select.where(key + ' IN ?', value);
      });
    }

    return select;
  },

  password: function(password) {
    return {
      hash: function() {
        var salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(password, salt);
      },
      compare: function(compare) {
        return bcrypt.compareSync(password, compare);
      }
    }
  },

  isTest: function() {
    return process.env.NODE_ENV == 'test';
  }
}