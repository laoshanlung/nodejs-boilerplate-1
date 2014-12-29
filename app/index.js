var express = require('./express')
  , faye = require('./faye')
  , config = require('./config')

// Get params
var argv = require('optimist').argv;

// port
var port = argv.port || 4000;

var server = express.listen(port, function() {
  console.log('Express server listening on port ', server.address().port);

  faye.attach(server);
  console.log("Faye Server listening on port: " + port);
  console.log("Faye is mounted to /" + config.faye.mount);
  global.app.fayeClient = faye.getClient();
});