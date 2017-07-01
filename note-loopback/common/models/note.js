'use strict';

module.exports = function(Note) {
  var fs = require('fs');

  Note.observe('before save', function encryptContent(ctx, next) {
    console.log('Requesting to encrypt content: %s', ctx.instance.content);
    var metadata = {};

    Note.app.models.TranslationClient.translate(
      ctx.instance.toJSON(),
      metadata,
      function(err, note) {
        if (err) {
          return next(err);
        }
        console.log('Content is now translated: %s', note.content);
        Note.app.models.EncryptionClient.encrypt(note, metadata, function(
          err,
          note
        ) {
          if (err) {
            return next(err);
          }
          console.log('Content is now encrypted: %s', note.content);
          ctx.instance.content = note.content;
          next();
        });
      }
    );
  });
};
