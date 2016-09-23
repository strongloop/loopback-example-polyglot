var zipkin = require('zipkin');
const {
  ExplicitContext,
  Tracer,
  Annotation,
  BatchRecorder,
  HttpHeaders: Header,
  option: {Some, None},
  TraceId
} = zipkin;

var grpc = require('grpc');

var HttpLogger = require('zipkin-transport-http').HttpLogger;

function createTracer(options) {
  var serverUrl = options.zipkinServerUrl || 'http://localhost:9411';
  console.log('Zipkin server: %s', serverUrl);
  var recorder = new BatchRecorder({
    logger: new HttpLogger({
      endpoint: serverUrl + '/api/v1/spans'
    }),
    timeout: options.timeout == null ? 60 * 1000000 : options.timeout
  });

  var ctxImpl = new ExplicitContext();
  var tracer = new Tracer({ctxImpl, recorder}); // configure your tracer properly here
  return tracer;
}

function containsRequiredHeaders(metadata) {
  return metadata[Header.TraceId.toLowerCase()] !== undefined &&
    metadata[Header.SpanId.toLowerCase()] !== undefined;
}

function readHeader(metadata, header) {
  const val = metadata[header.toLowerCase()];
  if (val != null) {
    return new Some(val);
  } else {
    return None;
  }
}

function stringToBoolean(str) {
  return str === '1';
}

function stringToIntOption(str) {
  try {
    var val = parseInt(str);
    if (isNaN(val)) {
      return None;
    }
    return new Some(val);
  } catch (err) {
    return None;
  }
}

function beginTrace(tracer, metadata) {
  console.log('Metadata for tracing: ', metadata);
  if (containsRequiredHeaders(metadata)) {
    const spanId = readHeader(metadata, Header.SpanId);
    spanId.ifPresent(sid => {
      const traceId = readHeader(metadata, Header.TraceId);
      const parentSpanId = readHeader(metadata, Header.ParentSpanId);
      const sampled = readHeader(metadata, Header.Sampled);
      const flags = readHeader(metadata, Header.Flags).flatMap(stringToIntOption).getOrElse(0);
      const id = new TraceId({
        traceId,
        parentId: spanId,
        spanId: tracer.createChildId().spanId,
        sampled: sampled.map(stringToBoolean),
        flags
      });
      tracer.setId(id);
    });
  } else {
    tracer.setId(tracer.createRootId());
    if (metadata[Header.Flags]) {
      const currentId = tracer.id;
      const idWithFlags = new TraceId({
        traceId: currentId.traceId,
        parentId: currentId.parentId,
        spanId: currentId.spanId,
        sampled: currentId.sampled,
        flags: readHeader(metadata, Header.Flags)
      });
      tracer.setId(idWithFlags);
    }
  }
  return tracer.id;
}

function serverInterceptorFactory(options) {
  options = options || {};

  var tracer = createTracer(options);

  return function intercept(serviceName, fn) {
    return function wrappedServiceMethod(call, cb) {
      var metadata = call.metadata.getMap();

      tracer.scoped(() => {
        beginTrace(tracer, metadata);
        const id = tracer.id;
        tracer.recordServiceName(serviceName);
        // tracer.recordRpc(req.method);
        // tracer.recordBinary('http.url', formatRequestUrl(req));
        tracer.recordAnnotation(new Annotation.ServerRecv());
        // tracer.recordAnnotation(new Annotation.LocalAddr({port}));

        if (id.flags !== 0 && id.flags != null) {
          tracer.recordBinary(Header.Flags, id.flags.toString());
        }

        fn(call, function() {
          var args = [].slice.call(arguments);
          tracer.scoped(() => {
            tracer.setId(id);
            // tracer.recordBinary('http.status_code', res.statusCode.toString());
            tracer.recordAnnotation(new Annotation.ServerSend());
            cb.apply(this, args);
          });
        });
      });
    };
  };
}

function traceClient(serviceName, options, headers, fn, cb) {

  options = options || {zipkinServerUrl: 'http://zipkin:9411'};
  var metadata = new grpc.Metadata();

  var tracer = createTracer(options);
  beginTrace(tracer, headers);
  var id = tracer.id;

  metadata.set(Header.TraceId, id.traceId);
  metadata.set(Header.SpanId, id.spanId);
  metadata.set(Header.ParentSpanId, id.parentId);
  if (id.sampled.present) {
    metadata.set(Header.Sampled, '1');
  } else {
    metadata.set(Header.Sampled, '0');
  }
  metadata.set(Header.Flags, id.flags.toString());

  tracer.scoped(function() {
    tracer.recordServiceName(serviceName);
    tracer.recordAnnotation(new Annotation.ClientSend());

    if (id.flags !== 0 && id.flags != null) {
      tracer.recordBinary(Header.Flags, id.flags.toString());
    }

    fn(metadata, function() {
      var args = [].slice.call(arguments);
      tracer.scoped(() => {
        tracer.setId(id);
        tracer.recordAnnotation(new Annotation.ClientRecv());
        cb.apply(this, args);
      });
    });
  });
}

module.exports = {
  createTracer,
  beginTrace,
  serverInterceptorFactory,
  HttpHeaders: Header,
  zipkin,
  traceClient
};
