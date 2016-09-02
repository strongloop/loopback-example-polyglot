var ProtoBuf = require("protobufjs");
var proto2json = require('protobufjs/cli/pbjs/targets/json');
var debug = require('debug')('grpc:swagger');
var yaml = require('js-yaml');

// https://developers.google.com/protocol-buffers/docs/proto3#json
function parseProto(protoFile) {
  var builder = ProtoBuf.loadProtoFile(protoFile);
  var jsonStr = proto2json(builder, {});
  if (debug.enabled) {
    debug('%s', jsonStr);
  }
  var jsonObj = JSON.parse(jsonStr);
  return jsonObj;
}

function proto2swagger(protoFile, format) {
  var json = parseProto(protoFile);
  var paths = {};
  json.services.forEach(function(service) {
    for (var m in service.rpc) {
      var path = '/' + m;
      var op = service.rpc[m];
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
                $ref: '#/definitions/' + service.rpc[m].request
              }
            }
          ],
          responses: {
            '200': {
              description: '',
              schema: {
                $ref: '#/definitions/' + service.rpc[m].response
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
    message.fields.forEach(function(field) {
      properties[field.name] = {
        type: field.type,
        format: field.type,
        required: field.field !== 'optional'
      }
    });
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
    return spec;
  } else {
    return swagger;
  }
}

module.exports = proto2swagger;



