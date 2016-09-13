module.exports = function(options) {
  var zipkin = require('zipkin');
  var Tracer = zipkin.Tracer;
  var ExplicitContext = zipkin.ExplicitContext;

  var HttpLogger = require('zipkin-transport-http').HttpLogger;

  var recorder = new zipkin.BatchRecorder({
    logger: new HttpLogger({
      endpoint: 'http://localhost:9411/api/v1/spans'
    })
  });

  var zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

  var ctxImpl = new ExplicitContext();

  var tracer = new Tracer({ctxImpl, recorder}); // configure your tracer properly here

// Add the Zipkin middleware
  return zipkinMiddleware({
    tracer,
    serviceName: 'note-loopback' // name of this application
  });
};
