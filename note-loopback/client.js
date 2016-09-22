var path = require('path');
var PROTO_PATH = path.join(__dirname, './proto/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);
var fs = require('fs');

function main() {
  var noteClient = new proto.NoteService('localhost:50051',
    grpc.credentials.createInsecure());

  var rootCerts = fs.readFileSync(path.join(__dirname, './bin/grpc.crt'));
  var ssl = grpc.credentials.createSsl(rootCerts);

  var encryptionClient = new proto.NoteService('localhost:50052', ssl);

  var metadata = new grpc.Metadata();
  metadata.set('x-my-header', 'x');
  noteClient.create({
    title: 'note1',
    content: 'my note'
  }, metadata, function(err, response) {
    if(err) {
      console.error(err);
    } else {
      console.log('Response:', response);
      noteClient.findById({id: response.id}, console.log);
      noteClient.find({}, console.log);
    }
  });
}

main();
