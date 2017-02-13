'use strict';

// Binds all functions of obj to the object, so they can be used as callbacks.
module.exports = function (obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === 'function') {
      obj[prop] = obj[prop].bind(obj);
    }
  }
}
