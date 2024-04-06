const serialization = require('./serialization');
const id = require('./id');
const wire = require('./wire');

util = {
  serialize: serialization.serialize,
  deserialize: serialization.deserialize,
  id: id,
  wire: wire,
};
global.util = util;

module.exports = util;
