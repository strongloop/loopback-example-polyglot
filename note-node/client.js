var path = require('path');
var PROTO_PATH = path.join(__dirname, '../note-common/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);

function main() {
  var noteClient = new proto.NoteService('localhost:50051',
    grpc.credentials.createInsecure());

  var encryptionClient = new proto.NoteService('localhost:50052',
    grpc.credentials.createInsecure());

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
