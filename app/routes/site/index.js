var express = require('express')
  , router = express.Router()

router.get('/', function(req, res, next){
  res.end('Hello world');
});

module.exports = router;