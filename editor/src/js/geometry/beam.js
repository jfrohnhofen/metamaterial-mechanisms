'use strict';

const THREE        = require('three');

const bind         = require('../misc/bind');
const VoxelElement = require('./voxel_element');

module.exports = (function() {

  function Beam(vertices, buffer) {
    bind(this);
    VoxelElement.call(this, vertices, buffer);
  }

  Beam.frontTop    = { element: Beam, vertices: [ 7, 3 ], id: 'bft' };
  Beam.frontBottom = { element: Beam, vertices: [ 5, 1 ], id: 'bfb' };
  Beam.frontLeft   = { element: Beam, vertices: [ 5, 7 ], id: 'bfl' };
  Beam.frontRight  = { element: Beam, vertices: [ 1, 3 ], id: 'bfr' };

  Beam.backTop     = { element: Beam, vertices: [ 2, 6 ], id: 'bBt' };
  Beam.backBottom  = { element: Beam, vertices: [ 0, 4 ], id: 'bBb' };
  Beam.backLeft    = { element: Beam, vertices: [ 4, 6 ], id: 'bBl' };
  Beam.backRight   = { element: Beam, vertices: [ 0, 2 ], id: 'bBr' };

  Beam.topLeft     = { element: Beam, vertices: [ 6, 7 ], id: 'btl' };
  Beam.topRight    = { element: Beam, vertices: [ 2, 3 ], id: 'btr' };
  Beam.bottomLeft  = { element: Beam, vertices: [ 4, 5 ], id: 'bbl' };
  Beam.bottomRight = { element: Beam, vertices: [ 0, 1 ], id: 'bbr' };

  Beam.prototype = Object.create(VoxelElement.prototype);

  Beam.prototype.positionMatrix = function(thickness) {
    thickness = thickness || 0;
    const edgeLength = thickness + 1.0;
    const length = this.vertices[0].distanceTo(this.vertices[1]) * edgeLength;
    return new THREE.Matrix4()
      .lookAt(this.vertices[0], this.vertices[1], new THREE.Vector3(0, 1, 0))
      .scale(new THREE.Vector3(thickness, thickness, length))
      .setPosition(this.center);
  }

  Beam.prototype.offsetMatrix = function() {
    return new THREE.Matrix4()
      .lookAt(this.vertices[0], this.vertices[1], new THREE.Vector3(0, 1, 0));
  }

  Beam.prototype.localEdges = function() {
    return [
      [0, 1]
    ];
  }

  Beam.prototype.buildRenderGeometry = function() {
    this.thickness = this.thickness/this.stiffnessFactor; //set to half so scaling of length works out nicely

    var beam = new THREE.BoxBufferGeometry(1.0, 1.0, 1.0); 
    var member = new THREE.BoxBufferGeometry(2.0, 2.0, 0.35);

    return [beam, member];
}

  return Beam;

})();
