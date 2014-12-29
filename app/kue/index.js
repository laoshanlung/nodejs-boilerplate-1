require('../global')
var argv = require('optimist').argv
  , express = require('express')

var basicAuth = require('basic-auth-connect');

var _ = require('underscore');
var kue = require('kue');
var handler = require('./handler');

var app = express();

app.use(basicAuth('chatwing', '123qweasdzxc'));
app.use(kue.app);
app.listen(argv.port || 4500, function(){
  handler.start();
});