var redis = requireFromRoot('libs/redis')
  , Chance = require('chance')

var chance = new Chance();

/**
 * Provides methods for verifying against a random code
 * @name VerificationCode
 * @mixin
 */
module.exports = {
  /**
   * generates redis key to store random code
   * this method needs to be implemented by each class that mixes this mixin
   * @param  {String} type
   * @return {String}
   */
  verificationCodeKey: function(type) {
    throw "Needs implementation";
  },

  /**
   * Generates a random code and stored in redis
   * @method VerificationCode#generateCode
   * @param  {String} type
   * @param  {Number} ttl in seconds
   * @return {String}
   */
  generateCode: function(type, ttl) {
    ttl = ttl || 3600; // 1h
    var random = chance.string({length: 128, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'});
    var key = this.verificationCodeKey(type);
    var redisInstance = redis.getInstance(key);

    return redisInstance.setex(key, ttl, random).then(function(){
      return random;
    });
  },

  /**
   * Verifies the code against one stored in redis
   * @method VerificationCode#verifyCode
   * @param  {String} type
   * @param  {String} code the code to compare
   * @return {Boolean}
   */
  verifyCode: function(type, code) {
    var key = this.verificationCodeKey(type);
    var redisInstance = redis.getInstance(key);

    return redisInstance.get(key).then(function(check){
      return code == check;
    });
  },

  /**
   * clears the verification code of type
   * @method VerificationCode#clearCode
   * @param  {String} type
   * @return {Number}
   */
  clearCode: function(type) {
    var key = this.verificationCodeKey(type);
    var redisInstance = redis.getInstance(key);

    return redisInstance.del(key);
  },
}