var swaggerParser = require('swagger-parser');
var debug = require('debug')('grpc:swagger');
var ProtoBuf = require('protobufjs');
var toProto = require('protobufjs/cli/pbjs/targets/proto');
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
    protoObj.messages.push(msg);
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
  protoObj.messages.push(reqMsg);

  var resMsg = {
    name: resMsgName,
    options: {},
    fields: []
  };
  var codes = Object.keys(op.responses);
  if (codes.length === 1) {
    // Single response mapped to a fixed message
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
    // Multiple responses mapped to oneof (union)
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
  protoObj.messages.push(resMsg);
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
    for (var i = 0, n = protoObj.services.length; i < n; i++) {
      if (protoObj.services[i].name === serviceName) {
        service = protoObj.services[i];
        break;
      }
    }
    if (!service) {
      // Create a new one and add it to proto
      service = {
        name: serviceName,
        options: {},
        rpc: {}
      };
      protoObj.services.push(service);
    }

    if (opId.indexOf(s + '.') === 0) {
      opId = opId.substring((s + '.').length);
    }
    var opName = opId.replace(/[\.\{\}]/g, '_');
    var options = {};

    options[OPTION_HTTP + '.' + verb] = path;
    // FIXME: protobuf doesn't allow object options
    // See https://github.com/googleapis/googleapis/blob/master/google/api/http.proto#L168-L171
    service.rpc[opName] = {
      request: reqMsgName,
      response: resMsgName,
      options: options
    };
    mapReqRes(op, reqMsgName, resMsgName, protoObj);
  });
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
    var prop = mapDefinitions(swagger, json);
    var services = {};

    for (var p in swagger.paths) {
      var apiPath = swagger.paths[p];
      for (var v in apiPath) {
        var op = apiPath[v];
        mapOperation(p, v, op, json);
      }
    }
    debug('%s', JSON.stringify(json, null, 2));
    var builder = ProtoBuf.newBuilder({});
    var root = path.join(__dirname, '../proto/_tmp.proto');
    builder['import'](json, root);
    var proto = toProto(builder);
    debug(proto);
    cb(null, proto);
  });
}

module.exports = swagger2proto;