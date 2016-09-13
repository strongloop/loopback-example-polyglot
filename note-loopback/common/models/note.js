module.exports = function(Note) {
  var path = require('path');
  var PROTO_PATH = path.join(__dirname, '../../../note-common/note.proto');

  var grpc = require('grpc');
  var proto = grpc.load(PROTO_PATH);

  var encryptionClient = new proto.EncryptionService('localhost:50052',
    grpc.credentials.createInsecure());

  Note.observe('before save', function encryptContent(ctx, next) {
    console.log('Encrypting content: %j', ctx.instance);
    encryptionClient.encrypt(ctx.instance.toJSON(), function(err, note) {
      if (err) {
        console.error(err);
        return next(err);
      }
      console.log('Encrypted note: %j', note);
      ctx.instance.content = note.content;
      next();
    });
  });

};
