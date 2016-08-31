var path = require('path');
var proto2swagger = require('./proto2swagger');
var json = proto2swagger(path.join(__dirname, '../note-common/note.proto'));
