/**
 * @private
 *
 * Discover an array services from the loaded proto object
 * @param {Function[]} services
 * @param {object} proto
 */
function introspectServices(services, proto) {
  for (var p in proto) {
    if (typeof proto[p] === 'function' && proto[p].service &&
      proto[p].service.className === 'Service') {
      // Found a grpc service
      services.push(proto[p]);
    }
    // Recurse into the package
    if (proto[p].constructor === Object) {
      introspectServices(services, proto[p]);
    }
  }
}

/**
 * @public
 *
 * Discover an array services from the loaded proto object
 * @param {object} proto
 * @returns {Function[]} services discovered
 */
function discoverServices(proto) {
  var services = [];
  introspectServices(services, proto);
  return services;
}

function discoverMethods(service) {
  var descriptor = service.service;
  var methods = {};
  descriptor.children.forEach(function(c) {
    if (c.className === 'Service.RPCMethod') {
      methods[c.name] = c;
    }
  });
  return methods;
}

exports.discoverServices = discoverServices;
exports.discoverMethods = discoverMethods;
