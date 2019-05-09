// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: grpc-swagger

var ProtoBuf = require("protobufjs");
var proto2json = require('protobufjs/cli/targets/json');
var debug = require('debug')('grpc:swagger');
var yaml = require('js-yaml');

function traverseTypes(current, metadata) {
  metadata.services = metadata.services || [];
  metadata.messages = metadata.messages || [];
  if (current instanceof ProtoBuf.Type) {
    metadata.messages.push(current);
  }

  if (current instanceof ProtoBuf.Service) {
    metadata.services.push(current);
  }
  if (current.nestedArray)
    current.nestedArray.forEach(function(nested) {
      traverseTypes(nested, metadata);
    });
}

// https://developers.google.com/protocol-buffers/docs/proto3#json
function parseProto(protoFile, cb) {
  ProtoBuf.load(protoFile, function(err, root) {
    if (err) return cb(err);
    var metadata = {};
    traverseTypes(root, metadata);
    cb(null, metadata);
  });
}

function proto2swagger(protoFile, format, cb) {
  parseProto(protoFile, function(err, json) {
    if (err) return cb(err);
    var paths = {};
    json.services.forEach(function(service) {
      for (var m in service.methods) {
        var path = '/' + m;
        var op = service.methods[m];
        paths[path] = {
          post: {
            tags: [service.name],
            summary: '',
            operationId: service.name + '.' + m,
            parameters: [
              {
                name: 'request',
                in: 'body',
                description: '',
                required: false,
                schema: {
                  $ref: '#/definitions/' + service.methods[m].requestType
                }
              }
            ],
            responses: {
              '200': {
                description: '',
                schema: {
                  $ref: '#/definitions/' + service.methods[m].responseType
                }
              }
            }
          }
        };
      }
    });

    var definitions = {};
    json.messages.forEach(function(message) {
      var properties = {};
      definitions[message.name] = {
        properties: properties
      };
      for (var f in message.fields) {
        let field = message.fields[f];
        let type = field.type;
        if (/int|fixed|double|float/.test(field.type)) {
          type = 'number';
        }
        if (field.type === 'bool') {
          type = 'boolean';
        }
        if (field.type === 'bytes' || field.type === 'enum') {
          type = 'string';
        }

        if (field.repeated) {
          type = [type];
        }
        properties[field.name] = {
          type: type,
          format: field.type,
          required: field.field !== 'optional'
        }
      }
    });

    var swagger = {
      version: '2.0',
      info: {
        version: '1.0.0',
        title: '',
        schemes: ['http', 'https'],
        host: '',
        basePath: '/api'
      },
      consumes: ['application/json'],
      produces: ['application/json'],
      paths: paths,
      definitions: definitions
    };

    debug('swagger.json: %j', swagger);

    if (format === 'yaml') {
      var spec = yaml.safeDump(swagger);
      debug('swagger.yaml: %s', spec);
      return cb(null, spec);
    } else {
      return cb(null, swagger);
    }
  });
}

module.exports = proto2swagger;



