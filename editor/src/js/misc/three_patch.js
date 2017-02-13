'use strict';

module.exports = function(THREE) {
  
  THREE.Vector3.prototype.abs = function() {
	this.x = Math.abs(this.x);
	this.y = Math.abs(this.y);
	this.z = Math.abs(this.z);
  	return this;
  }

  THREE.Vector3.prototype.largestComponent = function() {
  	const abs = this.clone().abs();
  	if (abs.x >= abs.y && abs.x >= abs.z) {
  		return 0;
  	} else if (abs.y >= abs.z) {
  		return 1;
  	} else {
  		return 2;
  	}
  }

}
