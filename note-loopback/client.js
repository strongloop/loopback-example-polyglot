var path = require('path');
var PROTO_PATH = path.join(__dirname, './proto/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);
var fs = require('fs');

var zipkinAgent = require('./lib/zipkin-agent');

function main() {
  var noteClient = new proto.NoteService('localhost:50051',
    grpc.credentials.createInsecure());

  var rootCerts = fs.readFileSync(path.join(__dirname, './bin/grpc.crt'));
  var ssl = grpc.credentials.createSsl(rootCerts);

  var encryptionClient = new proto.NoteService('localhost:50052', ssl);

  var tracer = zipkinAgent.createTracer({zipkinServerUrl: 'http://localhost:9411', timeout: 1});
  var metadata = new grpc.Metadata();
  zipkinAgent.beginTrace(tracer, metadata.getMap());
  const id = tracer.id;

  /*
   TraceId: 'X-B3-TraceId',
   SpanId: 'X-B3-SpanId',
   ParentSpanId: 'X-B3-ParentSpanId',
   Sampled: 'X-B3-Sampled',
   Flags: 'X-B3-Flags'
   */

  var Header = zipkinAgent.zipkin.HttpHeaders;
  var Annotation = zipkinAgent.zipkin.Annotation;

  metadata.set(Header.TraceId, id.traceId);
  metadata.set(Header.SpanId, id.spanId);
  metadata.set(Header.ParentSpanId, id.parentId);
  if (id.sampled === zipkinAgent.zipkin.option.Some) {
    metadata.set(Header.Sampled, '1');
  } else {
    metadata.set(Header.Sampled, '0');
  }
  metadata.set(Header.Flags, id.flags.toString());

  tracer.scoped(() => {
    tracer.recordServiceName('note-loopback-client');
    tracer.recordAnnotation(new Annotation.ClientSend());

    if (id.flags !== 0 && id.flags != null) {
      tracer.recordBinary(Header.Flags, id.flags.toString());
    }

    var note = {
      title: 'note1',
      content: 'my note'
    };

    noteClient.create(note, metadata, function(err, response) {
      tracer.scoped(() => {
        // tracer.recordBinary('http.status_code', res.statusCode.toString());
        tracer.recordAnnotation(new Annotation.ClientRecv());
        if (err) {
          console.error(err);
        } else {
          console.log('Response:', response);
          noteClient.findById({id: response.id}, console.log);
          noteClient.find({}, console.log);
          setTimeout(console.log, 500);
        }
      });
    });
  });
}

main();
