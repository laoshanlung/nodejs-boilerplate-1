var redis = require('../redis')
  , defaultTtl = 7200
  , nodefn = require('when/node/function')
  , debug = require('debug')('cache')

// support both array and string
var processCacheKey = function(key) {
  if (_.isArray(key)) {
    key = key.join(":");
  }

  return key;
}

var processValueBeforeSet = function(value) {
  if (_.isString(value)) {
    return value;
  }

  return JSON.stringify(value);
}

var processValueAfterGet = function(value) {
  try {
    value = JSON.parse(value);
  } catch (e) {
    
  }

  // if (process.env.NODE_ENV == 'development') {
  //   return null;
  // }

  return value;
}

/**
 * A general cache module using libs/redis underneath to pick servers
 */

module.exports = {
  set: function(key, value, options) {
    key = processCacheKey(key);
    options = options || {};
    options = _.defaults(options, {
      ttl: defaultTtl
    });

    var redisInstance = redis.getInstance(key);

    var originalValue = value;
    value = processValueBeforeSet(value);

    return redisInstance.setex(key, options.ttl, value).then(function(){
      return originalValue;
    });
  },

  get: function(key, options) {
    key = processCacheKey(key);
    options = options || {};
    options = _.defaults(options, {
      refresh: true, // auto refresh ttl
      ttl: defaultTtl
    });

    var redisInstance = redis.getInstance(key);

    return redisInstance.get(key).then(function(value){
      if (options.refresh) {
        redisInstance.expire(key, options.ttl).done(function(){}, function(){}); // do nothing?
      }
      value = processValueAfterGet(value);
      return value;
    });
  },

  del: function(key, options) {
    key = processCacheKey(key);
    options = options || {};

    var redisInstance = redis.getInstance(key);

    return redisInstance.del(key).then(function(result){
      return result;
    })
  },

  fetch: function(key, fn, options) {
    var self = this;
    key = processCacheKey(key);
    options = options || {};
    options = _.defaults(options, {
      ttl: defaultTtl,
      refresh: true,
      callback: false
    });
    
    return this.get(key, options).then(function(value){
      
      if (value) {
        return value;
      }
      var promise;
      if (options.callback) {
        // only support node-style callback
        promise = nodefn.call(fn);
      } else {
        promise = fn();
      }
      
      return promise.then(function(value){
        if (!value) {
          return when(null);
        }
        
        return self.set(key, value, options);
      });
    });

  },

  ttl: function(key, options) {
    var self = this;
    key = processCacheKey(key);
    options = options || {};

    var redisInstance = redis.getInstance(key);

    return redisInstance.ttl(key);
  },

  exists: function(key, options) {
    var self = this;

    key = processCacheKey(key);
    options = options || {};

    var redisInstance = redis.getInstance(key);

    return redisInstance.exists(key);
  }
}