var _ = require('underscore')
  , _s = require('underscore.string')
  , when = require('when')

module.exports = function(value, attribute, params) {
  var self = this;

  if (!value) {
    return when(null);
  }

  message = this.i18n().gettext("%(value)s is taken", {value: value});

  var select = this.squel.select().from(this.table);
  select.field('count(*)')
  select.where(attribute + ' = ?', value);

  if (this.getPrimaryKeyValue()) {
    select.where(this.primaryKey + ' != ?', this.getPrimaryKeyValue());  
  }
  
  select = select.toParam();

  return this.sendPgQuery(select.text, select.values).then(function(result){
    if (result.rows[0].count == 0) {
      return null;
    }
    return message;
  });
}