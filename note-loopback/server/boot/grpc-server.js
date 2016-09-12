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
      callback(err, {notes: values.map(function(v) {
        return v.toJSON();
      })});
    });
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
