var config = global.app.config

module.exports = function(options) {
  return function(req, res, next) {
    _.extend(res.locals, {
      config: config,
      assetPath: function(path) {
        if (path.charAt(0) == '/'
            || _s.startsWith(path, 'http://')
            || _s.startsWith(path, 'https://')) {
          return path;
        }

        return ['', config.assetVersion, path].join('/');
      },
      env: process.env.NODE_ENV || 'development'
    });

    _.extend(res.locals, req.i18n());

    next();
  }
}