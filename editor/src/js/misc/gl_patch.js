'use strict';

module.exports = function(gl) {
  const oldTexImage2D = gl.texImage2D;
  gl.texImage2D = function() {
  	// very dirty hack
  	if (arguments.length == 9) {
  		arguments[2] = 34836;
  	}
    oldTexImage2D.apply(gl, arguments);
  }
}
