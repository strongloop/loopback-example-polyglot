module.exports = function(app) {
  var path = require('path');
  var PROTO_PATH = path.join(__dirname, '../../../note-common/note.proto');

  var grpc = require('grpc');
  var proto = grpc.load(PROTO_PATH);

  /**
   * Implements the SayHello RPC method.
   */
  function create(call, callback) {
    var note = call.request;
    app.models.Note.create(note, function(err, result) {
      if (err) return callback(err);
      callback(null, result.toJSON());
    });
  }

  function findById(call, callback) {
    var id = call.request.id;
    app.models.Note.findById(id, function(err, result) {
      if (err) return callback(err);
      callback(null, result.toJSON());
    });
  }

  function find(call, callback) {
    var filter = (call.request && call.request.filter) || {};
    app.models.Note.find(filter, function(err, values) {
      callback(err, {
        notes: values.map(function(v) {
          return v.toJSON();
        })
      });
    });
  }

  /**
   * Starts an RPC server that receives requests for the Greeter service at the
   * sample server port
   */
  function main() {
    var server = new grpc.Server();
    var zipkinFactory = zipkinInterceptorFactory();
    server.addProtoService(proto.NoteService.service, {
        create: zipkinFactory('NoteService.create', create),
        findById: zipkinFactory('NoteService.findById', findById),
        find: zipkinFactory('NoteService.find', find)
      }
    );
    var remotingConfig = app.get('remoting') || {};
    var grpcConfig = remotingConfig.grpc || {};
    var host = grpcConfig.host || '0.0.0.0';
    var port = grpcConfig.port || 50051;
    var address = host + ':' + port;
    server.bind(address, grpc.ServerCredentials.createInsecure());
    server.start();
    console.log('Note gRPC service is running at %s', address);
  }

  main();
};

function zipkinInterceptorFactory() {
  var zipkin = require('zipkin');
  const {
    ExplicitContext,
    Tracer,
    Annotation,
    HttpHeaders: Header,
    option: {Some, None},
    TraceId
  } = zipkin;

  var HttpLogger = require('zipkin-transport-http').HttpLogger;

  var recorder = new zipkin.BatchRecorder({
    logger: new HttpLogger({
      endpoint: 'http://localhost:9411/api/v1/spans'
    })
  });

  var ctxImpl = new ExplicitContext();
  var tracer = new Tracer({ctxImpl, recorder}); // configure your tracer properly here

  function containsRequiredHeaders(metadata) {
    return metadata[Header.TraceId] !== undefined &&
      metadata[Header.SpanId] !== undefined;
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

  return function intercept(serviceName , fn) {
    return function wrappedServiceMethod(call, cb) {
      var metadata = call.metadata.getMap();
      tracer.scoped(() => {
        function readHeader(header) {
          const val = metadata[header];
          if (val != null) {
            return new Some(val);
          } else {
            return None;
          }
        }

        if (containsRequiredHeaders(metadata)) {
          const spanId = readHeader(Header.SpanId);
          spanId.ifPresent(sid => {
            const traceId = readHeader(Header.TraceId);
            const parentSpanId = readHeader(Header.ParentSpanId);
            const sampled = readHeader(Header.Sampled);
            const flags = readHeader(Header.Flags).flatMap(stringToIntOption).getOrElse(0);
            const id = new TraceId({
              traceId,
              parentId: parentSpanId,
              spanId: sid,
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
              flags: readHeader(Header.Flags)
            });
            tracer.setId(idWithFlags);
          }
        }

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
