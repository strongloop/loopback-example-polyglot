var swaggerParser = require('swagger-parser');
var debug = require('debug')('grpc:swagger');
var ProtoBuf = require('protobufjs');
var toProto = require('protobufjs/cli/pbjs/targets/proto');
var path = require('path');

function describeProperty(p) {
  var type = p.type;
  var rule = 'optional';
  if (p.schema) {
    var ref = p.schema.$ref;
    if (p.schema.type === 'array') {
      ref = p.schema.items.$ref;
      rule = 'repeated';
    } else if (p.schema.type) {
      type = p.schema.type;
    }
    if (ref) {
      var parts = ref.split('/');
      type = parts[parts.length - 1];
    }
  }
  if (type === 'number') {
    type = p.format || 'float';
  } else if (type === 'boolean') {
    type = 'bool';
  }
  if (type === 'object' || type === 'x-any') {
    type = 'google.protobuf.Any';
  }
  return {type: type, rule: rule};
}

function swagger2proto(swaggerFile, cb) {

  swaggerParser.bundle(swaggerFile, {}, function(err, swagger) {
    if (err) return cb(err);
    var json = {
      syntax: 'proto3',
      package: null,
      options: {},
      messages: [],
      services: [],
      imports: ['google/protobuf/any.proto']
    };
    for (var d in swagger.definitions) {
      if (d === 'x-any') continue;
      var msg = {
        name: d,
        fields: []
      };
      var def = swagger.definitions[d];
      var index = 0;
      for (var p in def.properties) {
        var prop = def.properties[p];
        var desc = describeProperty(prop);
        var field = {
          name: p,
          type: desc.type,
          rule: desc.rule,
          id: ++index
        };
        if (field.rule === 'optional') {
          field.rule = '';
        }
        msg.fields.push(field);
      }
      json.messages.push(msg);
    }
    var service = {
      name: 'Swagger',
      options: {},
      rpc: {}
    };
    json.services.push(service);
    for (var p in swagger.paths) {
      var apiPath = swagger.paths[p];
      for (var v in apiPath) {
        var op = apiPath[v];
        var reqMsgName = (op.operationId + 'Request').replace(/[\.\{\}]/g, '$');
        var resMsgName = (op.operationId + 'Response').replace(/[\.\{\}]/g, '$');
        var opName = op.operationId.replace(/[\.\{\}]/g, '$');
        service.rpc[opName] = {
          request: reqMsgName,
          response: resMsgName,
          options: {}
        };
        var reqMsg = {
          name: reqMsgName,
          options: {},
          fields: []
        };
        var id = 0;
        op.parameters.forEach(function(p) {
          var prop = describeProperty(p);
          var type = prop.type;
          var rule = prop.rule;
          var param = {
            name: p.name,
            id: ++id,
            rule: rule,
            type: type
          };
          reqMsg.fields.push(param);
        });
        json.messages.push(reqMsg);

        var resMsg = {
          name: resMsgName,
          options: {},
          fields: []
        };
        var codes = Object.keys(op.responses);
        if (codes.length === 1) {
          var prop = describeProperty(op.responses[codes[0]]);
          // Skip responses that don't have a type (void)
          if (prop.type) {
            resMsg.fields.push({
              name: 'response_' + codes[0],
              id: 1,
              type: prop.type,
              rule: prop.rule
            });
          }
        } else {
          resMsg.oneofs = {
            responses: {fields: []}
          };
          id = 0;
          for (var c in op.responses) {
            prop = describeProperty(op.responses[c]);
            if (prop.type) {
              resMsg.fields.push({
                oneof: 'responses', // point back to the oneof name
                name: 'response_' + c,
                id: ++id,
                type: prop.type,
                rule: prop.rule
              });
            }
          }
        }
        json.messages.push(resMsg);
      }
    }
    debug('%s', JSON.stringify(json, null, 2));
    var builder = ProtoBuf.newBuilder({});
    var root = path.join(__dirname, './_tmp.proto');
    builder['import'](json, root);
    var proto = toProto(builder);
    debug(proto);
    cb(null, proto);
  });
}

swagger2proto(path.join(__dirname, '../note-common/note.yaml'), function(err, proto) {
  console.log(proto);
});