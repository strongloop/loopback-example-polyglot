var path = require('path');
var PROTO_PATH = path.join(__dirname, './proto/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);
var fs = require('fs');

var zipkinAgent = require('./lib/zipkin-agent');

function main() {
  var noteClient = new proto.note.NoteService('localhost:50051',
    grpc.credentials.createInsecure());

  var rootCerts = fs.readFileSync(path.join(__dirname, './bin/grpc.crt'));
  var ssl = grpc.credentials.createSsl(rootCerts);

  var encryptionClient = new proto.note.NoteService('localhost:50052', ssl);

  zipkinAgent.traceClient('note-loopback-client',
    {zipkinServerUrl: 'http://localhost:9411'}, {},
    function(metadata, done) {
      var note = {
        title: 'note1',
        content: 'my note'
      };
      noteClient.create(note, metadata, done);
    }, function(err, response) {
      if (err) {
        console.error(err);
      } else {
        console.log('Response:', response);
        noteClient.findById({id: response.id}, function(err, note) {
          if (err) {
            console.error(err);
            return;
          }
          console.log('Note found: ', note);
          noteClient.find({}, function(err, notes) {
            if (err) {
              console.error(err);
              return;
            }
            console.log('Notes found: ', notes);
            setTimeout(function() {
              // Wait for 2 seconds so that tracing information can be written
              // out as the timer has 1 sec interval
              console.log('Done');
            }, 2000);
          });
        });
      }
    });
}

main();
