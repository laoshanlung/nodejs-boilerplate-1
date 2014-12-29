var nodemailer = require('nodemailer')
  , smtpTransport = require('nodemailer-smtp-transport')
  , sesTransport = require('nodemailer-ses-transport')
  , config = global.app.config
  , path = require('path')
  , SwigEmails = require("swig-emails");

var templateDir = path.join(__dirname, '..', '..', 'views', 'emails');
var emails = new SwigEmails({
  root: templateDir
});

var types = {
  smtp: smtpTransport,
  ses: sesTransport
}

var transporter = nodemailer.createTransport(types[config.email.type](config.email));

module.exports = {
  send: function(params) {
    var deferred = when.defer();

    params = params || {};
    params.from = params.from || config.email.from;
    params.context = params.context || {}
    _.extend(params.context, {
      baseUrl: config.params.ssl.url
    });

    // checks template
    var temp = params.template.split('.');
    if (temp.length == 1) {
      params.template += '.html';
    }
    
    emails.render(params.template, params.context, function(error, html, text){
      if (error) {
        deferred.reject(new ApplicationException(500, error));
      } else {
        params.html = html;
        params.text = text;
        transporter.sendMail(params, function(error, info){
          if(error) {
            deferred.reject(new ApplicationException(500, error));
          } else {
            deferred.resolve(info);
          }
        });
      }
    });

    return deferred.promise;
  }
}