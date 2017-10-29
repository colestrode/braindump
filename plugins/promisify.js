const Promise = require('bluebird');
const _ = require('lodash');

module.exports = {
  init: (controller) => {
    _.forOwn(controller.storage, (value, key) => {
      const group = controller.storage[key];
      Promise.promisifyAll(group, { context: group });
    });
  }
}