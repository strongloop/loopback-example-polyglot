var path = require('path');
var PROTO_PATH = path.join(__dirname, './spec/note.proto');

var grpc = require('grpc');
var proto = grpc.load(PROTO_PATH);

var notes = {};
var index = 0;

/**
 * Implements the SayHello RPC method.
 */
function create(call, callback) {
  var note = call.request;
  index++;
  note.id = index;
  notes[index.toString()] = note;
  callback(null, note);
}

function findById(call, callback) {
  var id = call.request.id;
  var note = notes[id];
  callback(null, note);
}

function find(call, callback) {
  console.log('find', call.request);
  var values = [];
  for(var i in notes) {
    values.push(notes[i]);
  }
  callback(null, {notes: values});
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
  var server = new grpc.Server();
  server.addProtoService(proto.NoteService.service, {
      create: create,
      findById: findById,
      find: find
    }
  );
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();
}

main();