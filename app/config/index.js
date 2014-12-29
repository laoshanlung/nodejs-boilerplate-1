var env = process.env.NODE_ENV || 'development'
  , _ = require('underscore')

var config = _.extend(require('./' + env + '.json'), {
  assetVersion: 1
  , apiVersion: 1
});

config.email = _.extend(config.email, {
  from: 'noreplay@chatwing.com'
});

config.locales = [
  {
    "code": "en",
    "label": "English"
  }
]

config.faye = {
  mount: 'comet',
  secret: 'QRCnGQz5KgrdrN77hxqFkfZd'
}

module.exports = config;