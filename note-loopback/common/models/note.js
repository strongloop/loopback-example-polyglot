// Copyright Owner 2016,2017. All Rights Reserved.
// Node module: 

module.exports = function(Note) {
  var fs = require('fs');

  var zipkinAgent = require('../../lib/zipkin-agent');

  /*
  var path = require('path');
  var grpc = require('grpc');
  var PROTO_PATH = path.join(__dirname, '../../proto/note.proto');

  var proto = grpc.load(PROTO_PATH);
  var rootCerts = fs.readFileSync(path.join(__dirname, '../../bin/grpc.crt'));
  var ssl = grpc.credentials.createSsl(rootCerts);
  var address = Note.settings.encryptionServiceAddress || 'localhost:50052';
  console.log('Encryption service address: %s', address);
  var encryptionClient = new proto.note.EncryptionService(address,
    ssl // grpc.credentials.createInsecure()
  );

  var translationServiceAddress = Note.settings.translationServiceAddress ||
    'localhost:50053';
  console.log('Translation service address: %s', translationServiceAddress);
  var translationClient = new proto.note.TranslationService(
    translationServiceAddress,
    grpc.credentials.createInsecure()
  );
  */

  Note.observe('before save', function encryptContent(ctx, next) {
    console.log('Requesting to encrypt content: %s', ctx.instance.content);

    zipkinAgent.traceClient('note-loopback.encrypt',
      {zipkinServerUrl: Note.settings.zipkinServerUrl}, ctx.options,
      function(metadata, done) {
        Note.app.models.TranslationClient.translate(ctx.instance.toJSON(), metadata,
          function(err, note) {
            if (err) {
              return done(err);
            }
            console.log('Content is now translated: %s', note.content);
            Note.app.models.EncryptionClient.encrypt(note, metadata,
              function(err, note) {
                if (err) {
                  return done(err);
                }
                console.log('Content is now encrypted: %s', note.content);
                ctx.instance.content = note.content;
                done();
              });
          });
      }, function(err, note) {
        if (err) {
          console.error(err);
          return next(err);
        }
        next();
      });
  });
};
