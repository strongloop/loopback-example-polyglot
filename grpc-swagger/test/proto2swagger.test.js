// Copyright Owner 2016,2017. All Rights Reserved.
// Node module: 

var path = require('path');
var proto2swagger = require('../index').proto2swagger;

describe('proto2swagger', function() {
  it('transform proto to swagger', function(done) {
    proto2swagger(path.join(__dirname, './note.proto'), 'yaml',
      function(err, spec) {
        console.log(spec)
        done(err, spec);
      });
  });
});
