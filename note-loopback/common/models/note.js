module.exports = function(Note) {
  var path = require('path');
  var fs = require('fs');
  var PROTO_PATH = path.join(__dirname, '../../proto/note.proto');

  var grpc = require('grpc');
  var proto = grpc.load(PROTO_PATH);

  var zipkinAgent = require('../../lib/zipkin-agent');

  var rootCerts = fs.readFileSync(path.join(__dirname, '../../bin/grpc.crt'));
  var ssl = grpc.credentials.createSsl(rootCerts);
  var address = Note.settings.encryptionServiceAddress || 'localhost:50052';
  var encryptionClient = new proto.EncryptionService(address,
    ssl // grpc.credentials.createInsecure()
  );

  Note.observe('before save', function encryptContent(ctx, next) {
    console.log('Requesting to encrypt content: %s', ctx.instance.content);

    zipkinAgent.traceClient('note-loopback.encrypt',
      {zipkinServerUrl: Note.settings.zipkinServerUrl}, ctx.options,
      function(metadata, done) {
        encryptionClient.encrypt(ctx.instance.toJSON(), metadata, done)
      }, function(err, note) {
        if (err) {
          console.error(err);
          return next(err);
        }
        console.log('Content is now encrypted: %s', note.content);
        ctx.instance.content = note.content;
        next();
      });
  });

};
