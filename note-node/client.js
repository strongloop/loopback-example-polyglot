var path = require('path');
var PROTO_PATH = path.join(__dirname, '../note-common/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);

function main() {
  var client = new proto.NoteService('localhost:50051',
    grpc.credentials.createInsecure());

  client.create({
    id: 1,
    title: 'note1',
    content: 'my note'
  }, function(err, response) {
    if(err) {
      console.error(err);
    } else {
      console.log('Response:', response);
      client.findById({id: response.id}, console.log);
      client.find({}, console.log);
    }
  });
}

main();
