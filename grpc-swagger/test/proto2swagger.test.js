var path = require('path');
var proto2swagger = require('../index').proto2swagger;

describe('proto2swagger', function() {
  it('transform proto to swagger', function() {
    var json = proto2swagger(path.join(__dirname, './note.proto'));
    console.log(json);
  });
});
