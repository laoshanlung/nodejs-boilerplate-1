var email = requireFromRoot('libs/email')
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore')

module.exports = {
  process: function(job, done) {
    var data = job.data;

    email.send(data).then(function(){

    }).done(done, done);
  },

  concurrency: 10
}