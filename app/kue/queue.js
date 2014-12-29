var kue = require('kue')
  , config = global.app.config


var redis = config.redis[0];
var jobs = kue.createQueue({
  redis: {
    port: redis.port,
    host: redis.host,
    auth: redis.password,
    options: {
      
    }
  }
});

module.exports = {
  jobs: jobs,
  create: function(name, data, options) {
    var deferred = when.defer();
    options = options || {};
    options = _.defaults(options, {
      priority: 'medium',
      attempts: 5,
      delay: false
    });

    var job = jobs.create(name, data).priority(options.priority).attempts(options.attempts);

    if (options.delay) {
      job.delay(options.delay);
    }

    job.save(function(error){
      if (error) {
        return deferred.reject(error);
      }

      deferred.resolve(job);
    });

    return deferred.promise;
  }
}