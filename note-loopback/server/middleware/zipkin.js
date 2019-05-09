// Copyright Owner 2016,2017. All Rights Reserved.
// Node module: 

module.exports = function(options) {
  var zipkinAgent = require('../../lib/zipkin-agent');
  var zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;
  var tracer = zipkinAgent.createTracer(options);

// Add the Zipkin middleware
  return zipkinMiddleware({
    tracer,
    serviceName: 'note-loopback' // name of this application
  });
};
