var Backbone = require('backbone')
  , pgConnection = requireFromRoot('libs/pg')
  , redisConnection = requireFromRoot('libs/redis')
  , squel = require('squel')
  , uuid = require('node-uuid')
  , fn   = require('when/function')
  , schemaVersions = require('../../schema/versions.json')
  , cache = requireFromRoot('libs/cache')
  , validators = require('./_validators')
  , translate = requireFromRoot('translations')
  , debug = require('debug')('sql')
  , utils = requireFromRoot('libs/utils')

squel.useFlavour('postgres');
squel.registerValueHandler(Array, function(arr){
  return '{' + arr.join(',') + '}';
});

squel.registerValueHandler(Object, function(obj){
  return JSON.stringify(obj);
});

squel.registerValueHandler("undefined", function(u){
  return -1;
});

/**
 * @name BaseModel
 * @constructor
 * @augments Backbone.Model
 */
var Model = Backbone.Model.extend({
  unsafeAttributes: [], // which attributes should be skipped when doing toJSON
  unsafeUpdate: [], // which attributes should be skipped when updating

  /**
   * attribute labels
   * @type {Object}
   * @public
   */
  attributeLabels: {},

  /**
   * gets the labels stored in {BaseModel#attributeLabels}
   * @method  BaseModel#getLabel
   * @param  {string} attribute
   * @return {string}
   */
  getLabel: function(attribute) {
    attributeLabels = _.result(this, 'attributeLabels');

    if (!attribute) {
      return attributeLabels;
    }

    return attributeLabels[attribute] || attribute;
  },

  primaryKey: 'id',

  getPrimaryKeyValue: function() {
    return this.get(this.primaryKey);
  },

  generateId: function() {
    var id = uuid.v1();
    this.set('id', id);
    return id;
  },

  isNew: function() {
    return this.getPrimaryKeyValue() == null;
  },

  _getColumns: function() {
    var self = this;
    var table = this.table;

    var schemaVersion = schemaVersions[table];

    if (!schemaVersion) {
      return fn(function(){
        throw "Weird table"
      });
    }

    var key = ['columns', table, schemaVersion].join(':');

    return cache.fetch(key, function(){
      var select = self.squel.select().from('INFORMATION_SCHEMA.COLUMNS')
                      .field('column_name')
                      .field('data_type')
                      .field('character_maximum_length')
                      .where('table_name = ?', table);

      select = select.toParam();
      return self.sendPgQuery(select.text, select.values).then(function(result){
        return result.rows;
      });
    });
  },

  save: function(options) {
    var self = this;
    options = options || {};
    options = _.defaults(options, {
      isNew: null, // custom isNew value
      validate: true, // runs validation or not
      json: false // whether to return the raw response or the new object
    });

    if (options.pgTransaction) {
      this.getPgTransactionFrom(options.pgTransaction);
    }

    var isNew = this.isNew();

    if (options.isNew !== null) {
      isNew = options.isNew;
    }

    var promise = when(); // starting point

    // automatically set scenario
    if (isNew) {
      this.setScenario('create');
    } else {
      this.setScenario('update');
    }

    promise = this._setupHook(promise, 'onBeforeSave', options);

    if (options.validate) {
      promise = this._setupHook(promise, 'onBeforeValidate', options);

      promise = promise.then(function(){
        return self.validate(options).then(function(result){
          if (result) {
            throw new ApplicationException(40000, self.getError());
          }

          return false;
        });
      });

      promise = this._setupHook(promise, 'onAfterValidate', options);
    } else {
      // fake
      promise = when(false);
    }

    if (isNew) {
      promise = promise.then(function(){
        return self.create(options);
      });
    } else {
      promise = promise.then(function(){
        return self.update(options);
      });
    }
    
    if (options.json) {
      
    } else {
      promise = promise.then(function(data){
        self.set(data);
        
        return data;
      });
    }

    promise = this._setupHook(promise, 'onAfterSave', options);
    
    return promise.then(function(){
      self.setScenario(null);
      return self;
    });
  },

  filterCreateAttributes: function(attributes) {
    var self = this;
    attributes = attributes || this.toJSON();
    
    var safe = _.clone(attributes);

    return this._getColumns().then(function(columns){
      // filters attributes that are not column
      _.each(safe, function(value, attribute){
        var column = _.findWhere(columns, {column_name: attribute});
        if (!column) {
          delete safe[attribute];
        }
      });

      return safe;
    });

    
  },

  create: function(options) {
    var self = this;
    var json = this.toJSON();

    var promise = this.filterCreateAttributes(json);

    promise = this._setupHook(promise, 'onBeforeCreate', options);

    return promise.then(function(safe){
      var create = self.squel.insert().into(self.table);

      _.each(safe, function(value, key){
        create.set(key, value);
      });

      create.returning('*');
      create = create.toParam();

      return self.sendPgQuery(create.text, create.values).then(function(result){
        safe = _.extend(safe, result.rows[0]);
        return safe;
      });
    });
  },

  filterUpdateAttributes: function(attributes) {
    attributes = attributes || this.toJSON();
    
    var safe = {};
    var skips = _.union([this.primaryKey], this.unsafeUpdate);

    _.each(attributes, function(value, key){
      if (_.indexOf(skips, key) == -1) {
        safe[key] = value;
      }
    });

    return this._getColumns().then(function(columns){
      // filters attributes that are not column
      _.each(safe, function(value, attribute){
        var column = _.findWhere(columns, {column_name: attribute});
        if (!column) {
          delete safe[attribute];
        }
      });

      return safe;
    });
  },

  update: function(options) {
    var self = this;

    options = options || {};

    var json = this.toJSON();

    var table = _.result(this, 'table');

    var update = this.squel.update()
                      .table(table)
                      .where('id = ?', this.id);

    var promise = this.filterUpdateAttributes(json).then(function(safe){
      _.each(safe, function(value, key){
        update.set(key, value);
      });

      update = update.toParam();

      return self.sendPgQuery(update.text, update.values).then(function(){
        return json;
      });
    });

    return this._setupHook(promise, 'onAfterUpdate', options);
  },

  delete: function(options) {
    options = options || {};
    var table = _.result(this, 'table');
    var self = this;

    if (options.pgTransaction) {
      this.getPgTransactionFrom(options.pgTransaction);
    }

    var del = this.squel.delete().from(table).where('id = ?', this.id);

    del = del.toParam();

    var promise = this.sendPgQuery(del.text, del.values);

    promise = this._setupHook(promise, 'onAfterDelete', options);

    return promise.then(function(){
      return self.toJSON();
    });
  },

  toJSON: function(options) {
    options = options || {};
    var exclude = options.exclude || [];
    var unsafeAttributes = _.union(this.unsafeAttributes, [], exclude);
    var attributes = _.clone(this.attributes);
    _.each(unsafeAttributes, function(attr){
      delete attributes[attr];
    });
    
    _.each(attributes, function(val, key){
      if (val instanceof Backbone.Model || val instanceof Backbone.Collection) {
        attributes[key] = val.toJSON();
      }
    });

    return attributes;
  },

  touch: function() {
    var attributes = Array.prototype.slice.apply(arguments);
    _.each(attributes, function(attribute){
      this.set(attribute, this.get(attribute));
    }, this);
  },

  defer: function() {
    var deferred = when.defer();
    var _reject = deferred.reject;

    deferred.reject = function(error) {
      _reject(error);
    }

    return deferred;
  },

  sendPgQuery: function(query, data) {
    if (this._pgTransactionalClient) {
      var deferred = when.defer();
      debug("[TRANSACTION %s-%s] %s %j", this._pgTransactionalClient.processID, this.cid, query, data);

      this._pgTransactionalClient.query(query, data, function(error, result){
        if (error) {
          console.log(error, query, data);
          return deferred.reject(error);
        }

        deferred.resolve(result);
      });

      return deferred.promise;
    }

    return pgConnection.sendQuery(query, data);
  },

  getRedisInstance: function(key) {
    return redisConnection.getInstance(key);
  },

  // returns the "class" of the instance, useful for calling "class methods"
  getClass: function() {
    return Object.getPrototypeOf(this).constructor;
  },

  /**
   * fetches data from the related table
   * @param {String} relation as defined in relations attribute
   * @param {Object} options
   * @return {Backbone.Model} the related model
   */
  fetchRelation: function(relation, options) {
    options = options || {};

    var relations = _.result(this, 'relations');

    var setting = relations[relation];

    var RelatedModel = setting[0];
    var type = setting[3] || Model.BELONGS_TO;

    switch (type) {
      case Model.HAS_MANY:
        var params = {};
        params[setting[2]] = this.get(setting[1]);
        return RelatedModel.findAll(params, options);
        break;
      default:
        var params = {};
        params[setting[2]] = this.get(setting[1]);
        return RelatedModel.find(params, options);
    }
  },

  setScenario: function(scenario) {
    this._scenario = scenario;
    return this;
  },

  getScenario: function() {
    return this._scenario;
  },

  _runValidator: function(validator, attribute, params) {
    attribute = _s.trim(attribute);
    var result = validator.apply(this, [this.get(attribute), attribute, params]);

    if (!result) {
      return when(null);
    }

    // thenable?
    if (!result.then) {
      return when(result);
    }

    return result;
  },

  validate: function(options) {
    var self = this;
    var scenario = this.getScenario();
    var rules = this.rules;

    if (!rules) {
      return when(0);
    }

    var tasks = [];

    _.each(rules, function(rule){
      var attribute = rule.attribute;

      var validatorName = '';
      var validatorParams = {};
      var validatorScenario = null;

      if (_.isString(rule)) {
        validatorName = rule;
      } else {
        validatorName = rule['validate'];
        validatorScenario = rule['scenario'];

        validatorParams = _.clone(rule);
        delete validatorParams['validate'];
        delete validatorParams['scenario'];
      }

      // checks scenario
      if (scenario && validatorScenario && validatorScenario != scenario) {
        return;
      }

      var validator = validators[validatorName];

      if (this[validatorName]) {
        validator = this[validatorName];
      }

      if (validator) {
        _.each(attribute, function(attr){
          var task = this._runValidator(validator, attr, validatorParams).then(function(result){
            return {
              attribute: attr,
              result: result
            };
          });

          tasks.push(task);
        }, this);
      }
    }, this);

    return when.all(tasks).then(function(results){
      _.each(results, function(result){
        if (result.result) {
          self.addError(result.attribute, result.result);  
        }
      });

      return _.size(self.getError());
    });
  },

  addError: function(attribute, message) {
    this._errors = this._errors || {};

    if (!this._errors[attribute]) {
      this._errors[attribute] = [];
    }

    this._errors[attribute].push(message);
    return this;
  },

  getError: function(attribute) {
    this._errors = this._errors || {};

    if (!attribute) {
      return this._errors;      
    }

    return this._errors[attribute];
  },

  hasError: function(attribute) {
    return this.getError(attribute) == null;
  },

  _setupHook: function() {
    var args = Array.prototype.slice.apply(arguments);
    var self = this;
    var promise = args[0];
    var name = args[1];
    var hookArgs = args.slice(2);

    var hook = this[name];

    if (hook && _.isFunction(hook)) {
      promise = promise.then(function(data){
        if (!_.isUndefined(data)) {
          hookArgs.unshift(data);  
        }

        return hook.apply(self, hookArgs);
      });
    }

    return promise;
  },

  read: function(options) {
    var conditions = this.toJSON();
    var select = this.squel.select()
                      .from(this.table);

    _.each(conditions, function(value, key){
      select.where(key + ' = ?', value);
    });

    select = select.toParam();

    return this.sendPgQuery(select.text, select.values).then(function(result){
      if (result.rowCount == 0) {
        return null;
      }
      return result.rows[0];
    });
  },

  urls: {},

  getUrl: function(name) {
    var url = this.urls[name];

    if (!url) {
      return '/';
    }

    return _s.sprintf(url, this.toJSON());
  }

}, {
  collection: function(objects){
    objects = objects || [];
    var CollectionClass = this.collectionClass || Backbone.Collection;

    return new CollectionClass(objects);
  },

  findAll: function(conditions, options) {
    var self = this;
    options = options || {};
    options = _.defaults(options, {
      json: false,
      limit: 20,
      offset: 0
    });

    var promise = null;
    if (this.prototype.list) {
      promise = this.prototype.list(conditions, options);
    } else {
      var select = this.prototype.squel.select()
                        .from(this.prototype.table);

      _.each(conditions, function(value, key){
        select.where(key + ' = ?', value);
      });

      select = utils.buildSelect(select, options);

      select = select.toParam();

      promise = this.prototype.sendPgQuery(select.text, select.values).then(function(result){
        return result.rows;
      });
    }

    return promise.then(function(records){
      var models = [];
      if (options.json) {
        _.each(records, function(record){
          models.push(record);
        });
      } else {
        return self.collection(records);
      }

      return models;
    });
  },

  count: function(conditions, options) {
    conditions = conditions || {};
    options = options || {};

    var select = this.prototype.squel.select().field('count(*) AS count')
    select.from(this.prototype.table);

    _.each(conditions, function(value, key){
      select.where(key + ' = ?', value);
    });

    if (options.search && options.searchFields) {
      var s = '%' + options.search + '%';
      var queries = [];
      var params = [];
      _.each(options.searchFields, function(field){
        queries.push(field + ' ILIKE ?');
        params.push(s);
      });

      var searchType = options.searchType || 'OR';
      queries = queries.join(' ' + searchType + ' ');
      params.unshift(queries)
      select.where.apply(select, params);
    }

    select = select.toParam();

    return this.prototype.sendPgQuery(select.text, select.values).then(function(result){
      return parseInt(result.rows[0].count);
    });
  },

  /**
   * finds one record using conditions, if the subclass has read method, use it
   * @param {Object} conditions
   * @param {Object} options
   *         json: whether to return json data or the full object with methods and everything
   * @return {object}
   */
  find: function(conditions, options) {
    options = options || {};
    options = _.defaults(options, {
      json: false
    });

    var req = options.req;
    var res = options.res;

    var model = new this(conditions);

    var promise = model.read(options);;

    return promise.then(function(response){
      var data = response && response.data || response;
      if (!data) {
        return when(null);
      }

      var promise = when(data);
      promise = model._setupHook(promise, 'onAfterFind', data, options);

      return promise.then(function(data){
        if (data) {
          model.set(data);
        }

        return data;
      });
    }).then(function(data){
      // decides what to return
      if (!data) {
        return null;
      }

      if (!options.json) {
        return model;
      }
      
      return data;
    });
  },

  deleteAll: function(attributes, options) {
    attributes = attributes || {};
    options = options || {};

    var table = this.prototype.table;

    var del = this.prototype.squel.delete().from(table);

    if (_.size(attributes) > 0) {
      _.each(attributes, function(value, key){
        del.where(key + ' = ?', value);
      });
    }

    del = del.toParam();

    return this.prototype.sendPgQuery(del.text, del.params);
  }
});

// squel proxy methods
Model.prototype.squel = {};
var squelProxyMethods =['select', 'update', 'delete', 'insert'];
_.each(squelProxyMethods, function(method){
  Model.prototype.squel[method] = function() {
    return squel[method].apply(squel, Array.prototype.slice.apply(arguments));
  }
});

// translation stuff
Model.prototype.i18n = function(instance) {
  if (instance) {
    this._i18n = instance;
  }

  // default one
  if (!this._i18n) {
    return {
      gettext: function(text, data) {
        return _s.sprintf(text, data);
      },

      ngettext: function(singular, plural, check, data) {
        var text = singular;
        if (check > 1) {
          text = plural;
        }

        return _s.sprintf(text, data);
      }
    }
  }

  return this._i18n;
}

Model.HAS_ONE = 'HAS_ONE';
Model.BELONGS_TO = 'BELONGS_TO';
Model.HAS_MANY = 'HAS_MANY';

// transaction stuff
_.extend(Model.prototype, {
  getPgTransactionFrom: function(source) {
    if (!source._pgTransactionalClient) {
      return;
    }
    // pass transaction client from one model to another
    this._pgTransactionalClient = source._pgTransactionalClient;
  },

  clearTransaction: function() {
    // ending transaction must be called manually to avoid conflicts
    this._pgTransactionalClient = null;
  },

  begin: function() {
    var self = this;
    
    return pgConnection.createClient().then(function(client){
      self._pgTransactionalClient = client;
      return self.sendPgQuery('BEGIN').then(function(){
        return null;
      });
    });
  },

  commit: function(data) {
    var self = this;
    return this.sendPgQuery('COMMIT').then(function(){
      self._pgTransactionalClient.end();
      self.clearTransaction();
      return data;
    });
  },

  rollback: function() {
    var self = this;
    return this.sendPgQuery('ROLLBACK').then(function(){
      self._pgTransactionalClient.end();
      self.clearTransaction();
    });
  }
});

// extract arguments
Model.prototype._extractArguments = function(args, names, defaults) {
  args = Array.prototype.slice.apply(args);

};

module.exports = Model;