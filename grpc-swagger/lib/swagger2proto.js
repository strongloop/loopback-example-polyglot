// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: grpc-swagger

var swaggerParser = require('swagger-parser');
var debug = require('debug')('grpc:swagger');
var ProtoBuf = require('protobufjs');
var toProto = require('protobufjs/cli/targets/proto');
var path = require('path');

var OPTION_HTTP = '(loopback.http)';

/**
 * Describe a property type & rule
 * @param {object} p Property descriptor
 * @returns {{type: string, rule: string}}
 */
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

/**
 * Map Swagger model definitions into proto messages
 * @param {object} swagger Swagger spec
 * @param {object} protoObj JSON representation of proto
 * @returns {*}
 */
function mapDefinitions(swagger, protoObj) {
  for (var d in swagger.definitions) {
    if (d === 'x-any') continue;
    var type = new ProtoBuf.Type(d);

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

      type.add(new ProtoBuf.Field.fromJSON(p, field));
    }
    protoObj.add(type);
  }
  return prop;
}

/**
 * Map request & response to proto messages
 * @param {object} op Swagger operation object
 * @param {string} reqMsgName Request message name
 * @param {string} resMsgName Response message name
 * @param {object} protoObj JSON representation of proto
 */
function mapReqRes(op, reqMsgName, resMsgName, protoObj) {
  var reqType = new ProtoBuf.Type(reqMsgName);
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
    reqType.add(ProtoBuf.Field.fromJSON(p.name, param));
  });
  protoObj.add(reqType);

  var resType = new ProtoBuf.Type(resMsgName);
  var codes = Object.keys(op.responses);
  if (codes.length === 1) {
    // Single response mapped to a fixed message
    var prop = describeProperty(op.responses[codes[0]]);
    // Skip responses that don't have a type (void)
    if (prop.type) {
      let field = {
        name: 'response_' + codes[0],
        id: 1,
        type: prop.type,
        rule: prop.rule
      };
      resType.add(ProtoBuf.Field.fromJSON(field.name, field));
    }
  } else {
    // Multiple responses mapped to oneof (union)
    id = 0;
    let responsesUnion = ProtoBuf.OneOf.fromJSON('responses', {});
    resType.add(responsesUnion);
    for (var c in op.responses) {
      prop = describeProperty(op.responses[c]);
      if (prop.type) {
        responsesUnion.add(ProtoBuf.Field.fromJSON('response_' + c, {
          name: 'response_' + c,
          id: ++id,
          type: prop.type,
          rule: prop.rule
        }));
      }
    }
  }
  protoObj.add(resType);
}

/**
 * Map a swagger operation to proto service rpc method
 * @param {object} op Swagger operation object
 * @param {object} protoObj JSON representation of proto
 */
function mapOperation(path, verb, op, protoObj) {
  var opId = op.operationId;
  var reqMsgName = (opId + 'Request').replace(/[\.\{\}]/g, '_');
  var resMsgName = (opId + 'Response').replace(/[\.\{\}]/g, '_');

  var services = [];
  if (Array.isArray(op.tags) && op.tags.length > 0) {
    services = op.tags;
  } else {
    services = ['Rest']
  }

  services.forEach(function(s) {
    var serviceName = s + 'Service';
    var service;
    // Match existing services
    if (protoObj.nestedArray) {
      for (var i = 0, n = protoObj.nestedArray.length; i < n; i++) {
        let item = protoObj.nestedArray[i];
        if ((item instanceof ProtoBuf.Service) && item.name === serviceName) {
          service = item;
          break;
        }
      }
    }
    if (!service) {
      // Create a new one and add it to proto
      service = ProtoBuf.Service.fromJSON(serviceName, {
        name: serviceName,
        options: {}
      });
      protoObj.add(service);
    }

    if (opId.indexOf(s + '.') === 0) {
      opId = opId.substring((s + '.').length);
    }
    var opName = opId.replace(/[\.\{\}]/g, '_');
    var options = {};

    options[OPTION_HTTP + '.' + verb] = path;
    // FIXME: protobuf doesn't allow object options
    // See https://github.com/googleapis/googleapis/blob/master/google/api/http.proto#L168-L171
    service.add(ProtoBuf.Method.fromJSON(opName, {
      requestType: reqMsgName,
      responseType: resMsgName,
      options: options
    }));
    mapReqRes(op, reqMsgName, resMsgName, protoObj);
  });
}

function swagger2proto(swaggerFile, cb) {

  swaggerParser.bundle(swaggerFile, {}, function(err, swagger) {
    if (err) return cb(err);
    var root = ProtoBuf.Root.fromJSON({
      syntax: 'proto3',
      package: null,
      options: {}
    });
    for (let t in ProtoBuf.common) {
      root.addJSON(ProtoBuf.common[t].nested);
    }
    var prop = mapDefinitions(swagger, root);
    var services = {};

    for (var p in swagger.paths) {
      var apiPath = swagger.paths[p];
      for (var v in apiPath) {
        var op = apiPath[v];
        mapOperation(p, v, op, root);
      }
    }
    toProto(root, {}, cb);
  });
}

module.exports = swagger2proto;
