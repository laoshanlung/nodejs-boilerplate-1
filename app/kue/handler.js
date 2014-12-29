// setup kue
var _ = require('underscore')
  , queue = require('./queue')
  , jobs = require('./jobs');

module.exports = {
  start: function() {
    _.each(jobs, function(job, name){
      var process;
      if (_.isFunction(job)) {
        process = job;
      } else {
        process = job.process;
      }

      var concurrency = 1;
      if (job.concurrency) {
        concurrency = job.concurrency;
      }

      console.log("Initiate %s job handler", name);
      queue.jobs.process(name, job.process);
    });
  }
}