var config = global.app.config.postgresql
  , pg = require('pg')
  , Client = pg.Client
  , username = config.username
  , password = config.password
  , host = config.host
  , port = config.port
  , database = config.database
  , debug = require('debug')('sql')
  
var connectionString = 'tcp://' + username + ':' + password + '@' + host + ':' + port + '/' + database;
pg.defaults.poolSize = 0;

pg.types.setTypeParser(1015, function(val){
  return pg.types.getTypeParser(1009, 'text')(val.toString());
});

module.exports = {
  createClient: function() {
    var deferred = when.defer();
    var client = new pg.Client(connectionString);

    client.connect(function(error){
      if (error) {
        return deferred.reject(error);
      }

      deferred.resolve(client);
    });

    return deferred.promise;
  },

  sendQuery: function(query, data) {
    debug("%s %j", query, data);
    data = data || [];
    var deferred = when.defer();

    this.createClient().done(function(client){
      client.query(query, data, function(error, result){
        client.end(); // always terminates the connection

        if (error) {
          console.log(query, data);
          return deferred.reject(error);
        }

        deferred.resolve(result);
      });
    }, function(error){
      deferred.reject(error);
    });

    return deferred.promise;
  }
}
