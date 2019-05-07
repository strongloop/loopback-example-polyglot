// Copyright Owner 2016. All Rights Reserved.
// Node module: 

var path = require('path');
var swagger2proto = require('../index').swagger2proto;

describe('swagger2proto', function() {
  it('transform swagger to proto', function(done) {
    swagger2proto(path.join(__dirname, './note.yaml'),
      function(err, proto) {
        console.log(proto);
        done();
      });
  });
});
