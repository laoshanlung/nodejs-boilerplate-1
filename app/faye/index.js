var Faye = require('faye')
  , fayeRedis = require('faye-redis')
  , config = require('../config')
  , redisConfig = config.redis[0]
  , debug = require('debug')('faye')
  , metaChannelRegex = /\/meta\/(.*)/gi

var bayeux = new Faye.NodeAdapter({
  mount: '/' + config.faye.mount
  , timeout: 120
  , engine : {
    type:   fayeRedis,
    host:   redisConfig.host,
    port:   redisConfig.port,
    password: redisConfig.password,
    namespace: 'faye'
  }
});

var client = bayeux.getClient() // global client
  , channelKeyPrefix = 'faye/channels';
  
bayeux.bind('handshake', function(clientId){
  //log.info(clientId + " handshake");
});

bayeux.bind('subscribe', function(clientId, channel){
  //log.info(clientId + " join " + channel);
});

bayeux.bind('unsubscribe', function(clientId, channel){
  //log.info(clientId + " leave " + channel);
});

bayeux.bind('publish', function(clientId, channel, data){
  //log.info(clientId + " publish something to " + channel);
  //log.info(data);
});

bayeux.bind('disconnect', function(clientId){
  //log.info(clientId + " disconnect");
});

var serverAuth = {
  incoming: function(message, callback) {
    if (message.data && message.data.event) {
      var secret = message.data.ext && message.data.ext.secret;
      if (secret != config.faye.secret) {
        message.error = "Invalid request"
      }

      delete message.data.ext.secret;
      callback(message);      
    } else {
      callback(message);
    }
  }
}

bayeux.addExtension(serverAuth);

module.exports = bayeux;