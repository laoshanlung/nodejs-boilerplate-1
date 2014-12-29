var config = require('./config')
  , fs = require('fs')
  , _ = require('underscore')._
  , _s = require('underscore.string')
  , when = require('when')

global._ = _;
global._s = _s;
global.when = when;

global.app = {};
global.app.rootPath = __dirname;
global.app.config = require('./config')

global.requireFromRoot = global.app.requireFromRoot = function(name) {
  if (name.charAt(0) != '/') {
    name = '/' + name;
  }
  return require(global.app.rootPath + name);
}

global.app.publish = function(channel, event, data) {
  var fayeClient = global.app.fayeClient;

  if (channel.charAt(0) != '/') {
    channel = '/' + channel;
  }

  if (!fayeClient) {
    return null;
  }

  var message = {
    event: event,
    params: data,
    ext: {
      secret: config.faye.secret
    }
  }
  
  return fayeClient.publish(channel, message);
}

global.setupExports = global.app.setupExports = function(dir, skips) {
  skips = skips || [];
  skips.push('index.js');
  var exports = {};
  var methods = fs.readdirSync(dir);
  for (var i in methods) {
    var method = methods[i];
    if (skips.indexOf(method) != -1) {
      continue;
    }

    var methodName = _s.camelize(method.split('.')[0]);
    var methodRequirePath = dir + '/' + method;
    exports[methodName] = require(methodRequirePath);
  }

  return exports;
}

// Global application error
// this hash map mobile code to HTTP code and message
global.YAML = require('js-yaml');
global.errorCodes = YAML.safeLoad(fs.readFileSync(__dirname + '/data/error_codes.yaml', 'utf8'));

global.ApplicationException = function(code, params) {
  if (_.isFunction(code) && code instanceof this.prototype) {
    this.message = code.message;
    this.code = code.code;
    this.httpCode = code.httpCode;
    this.params = code.params;
    this.stack = code.stack;
  } else {
    var errorCode = _.findWhere(errorCodes, {
      api: code
    });

    this.message = errorCode.message || "Unknown error";
    this.code = errorCode.api || 666;
    this.httpCode = errorCode.http || 400;
    this.params = params || null;

    this.stack = (new Error()).stack;
  }
}

global.ApplicationException.prototype = Error;
global.ApplicationException.prototype.toString = function() {
  return this.message || "Unknown error";
}