require('../global');

var express = require('express')
  , http = require('http')
  , path = require('path')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , session = require('cookie-session')
  , swig = require('swig')
  , errorHandler = require('errorhandler')
  , compress = require('compression')
  , config = global.app.config
  , swigExtras = requireFromRoot('swig')
  , routes = requireFromRoot('routes')
  , middlewares = requireFromRoot('middlewares')

_.each(swigExtras.filters, function(filter, name){
  swig.setFilter(name, filter);
});

_.each(swigExtras.tags, function(tag, name){
  var n = tag.name || name;
  swig.setTag(n, tag.parse, tag.compile, tag.ends, tag.blockLevel);
});

var app = express();

app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.enable('trust proxy');

app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')));

app.use(compress({
  memLevel: 3,
  level: 3
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

var multer  = require('multer')
app.use(multer({
  limits: {
    fileSize: 2*1024*1024 // 2 MBs
  }
}));

app.use(cookieParser());

app.use(session({
  key: config.session.key,
  secret: config.session.secret,
  proxy: true,
  cookie: {
    maxAge: config.session.maxAge 
  }
}));
app.use(methodOverride());

var env = process.env.NODE_ENV || 'development';

switch (env) {
  case 'production':
    app.set('view cache', true);

    app.use(function(err, req, res, next){
      res.status(404).render('error');
    });
    break;
  case 'test':
    // app.use(logger('dev'));
    
    app.use(errorHandler({
      dumpExceptions : true,
      showStack : true
    }));

    app.set('view cache', false);
    break;
  default:
    app.use(logger('dev'));

    app.use(errorHandler({
      dumpExceptions : true,
      showStack : true
    }));

    app.set('view cache', false);
    break;
}

// Redirect www to non-www
app.get('/*', function(req, res, next) {
  if (typeof(req.headers.host) === 'undefined') {
    next();
  } else {
    if (req.headers.host.match(/^www/) !== null ) {
      res.redirect(301, 'http://' + req.headers.host.replace(/^www\./, '') + req.url);
    } else {
      next();
    }
  }
});

// setup custom middlewares
app.use(middlewares.responseHelpers());
app.use(middlewares.requestHelpers());
app.use(middlewares.templateHelpers());

app.use(routes.site);

module.exports = app;