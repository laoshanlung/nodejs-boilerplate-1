var configs = global.app.config.redis
  , redis = require("redis")
  , cache = {}
  , HashRing = require('hashring')
  , debug = require('debug')

var instances = {}; // an internal hash to store redis instances accessed by host:port

// construct rings
var ringKeys = _.map(configs, function(c){
  return [c.host, c.port].join(":");
});
var rings = new HashRing(ringKeys);

// create an instance if it does not exist
var createInstance = function(config) {
  var key = [config.host, config.port].join(":");

  if (!instances[key]) {
    var params = {};
    if (config.password) {
      params.auth_pass = config.password;
    }
    var client = redis.createClient(config.port, config.host, params);

    instances[key] = liftOps(client);
    instances[key].raw = client;
  }
  return instances[key];
}

var redisBindFunction = function(client, op) {
  return function() {
    var deferred = when.defer();
    var args = _.values(arguments);
    debug("redis:"+op.toLowerCase())("%s %j", op, args[0]);
    args.push(function(){
      if (arguments[0]) {
        deferred.reject(arguments[0]);
      } else {
        deferred.resolve(arguments[1]);
      }
    });
    client[op].apply(client, args);
    return deferred.promise;
  }
}

// From https://gist.github.com/tobiash/2884566 and modify to use when 
var liftOps = function(client) {
  var functions, lc, op, ops, p, _i, _len;
  functions = _.functions(client);
  ops = functions.filter(function(f) {
    return f.toUpperCase() === f;
  });
  lc = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = ops.length; _i < _len; _i++) {
      op = ops[_i];
      _results.push(op.toLowerCase());
    }
    return _results;
  })();
  ops = ops.concat(lc);
  p = {};
  for (_i = 0, _len = ops.length; _i < _len; _i++) {
    op = ops[_i];
    p[op] = redisBindFunction(client, op);
  }
  p["multi"] = p["MULTI"] = function() {
    var m;
    m = client.multi.call(client, arguments);
    m.exec = redisBindFunction(m, 'exec');
    return m;
  };
  return p;
};

var getInstance = function(key) {

  var hostPort = rings.get(key);
  hostPort = hostPort.split(':');
  var host = hostPort[0];
  var port = hostPort[1];
  config = _.findWhere(configs, {
    host: host,
    port: parseInt(port)
  });

  return createInstance(config);
}

module.exports = {
  getInstance: getInstance,
  instances: instances
}