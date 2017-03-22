module.exports = function(app) {
  var path = require('path');
  var PROTO_PATH = path.join(__dirname, '../../proto/note.proto');

  var grpc = require('grpc');
  var proto = grpc.load(PROTO_PATH);

  var zipkinAgent = require('../../lib/zipkin-agent');

  /**
   * Implements the SayHello RPC method.
   */
  function create(call, callback) {
    var note = call.request;
    var options = call.metadata.getMap();
    app.models.Note.create(note, options, function(err, result) {
      if (err) return callback(err);
      callback(null, result.toJSON());
    });
  }

  function findById(call, callback) {
    var id = call.request.id;
    var options = call.metadata.getMap();
    app.models.Note.findById(id, options, function(err, result) {
      if (err) return callback(err);
      callback(null, result.toJSON());
    });
  }

  function find(call, callback) {
    var options = call.metadata.getMap();
    var filter = (call.request && call.request.filter) || {};
    app.models.Note.find(filter, options, function(err, values) {
      callback(err, {
        notes: values.map(function(v) {
          var obj = v.toJSON();
          obj.id = parseInt(obj.id);
          return obj;
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
    var remotingConfig = app.get('remoting') || {};
    var grpcConfig = remotingConfig.grpc || {};
    var host = grpcConfig.host || '0.0.0.0';
    var port = grpcConfig.port || 50051;
    var address = host + ':' + port;
    var zipkinServerUrl = grpcConfig.zipkinServerUrl || 'http://localhost:9411';

    var zipkinFactory = zipkinAgent.serverInterceptorFactory(
      {zipkinServerUrl: zipkinServerUrl});
    server.addProtoService(proto.note.NoteService.service, {
        create: zipkinFactory('note-loopback.create', create),
        findById: zipkinFactory('note-loopback.findById', findById),
        find: zipkinFactory('note-loopback.find', find)
      }
    );

    server.bind(address, grpc.ServerCredentials.createInsecure());
    server.start();
    console.log('Note gRPC service is running at %s', address);
  }

  main();
};

