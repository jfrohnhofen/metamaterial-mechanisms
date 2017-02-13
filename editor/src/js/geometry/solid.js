'use strict';

const THREE        = require('three');

const bind         = require('../misc/bind');
const VoxelElement = require('./voxel_element');

module.exports = (function() {

  function Solid(vertices, buffer) {
    bind(this);
    VoxelElement.call(this, vertices, buffer);
  }

  Solid.solid = { element: Solid, vertices: [ 0, 1, 2, 3, 4, 5, 6, 7 ], id: 's' };

  Solid.prototype = Object.create(VoxelElement.prototype);

  Solid.prototype.positionMatrix = function(thickness) {
    thickness = thickness || 0;
    const edgeLength = thickness + 1.0;
    return new THREE.Matrix4()
      .scale(new THREE.Vector3(edgeLength, edgeLength, edgeLength))
      .setPosition(this.center);
  }

  Solid.prototype.offsetMatrix = function() {
    return new THREE.Matrix4();
  }

  Solid.prototype.localEdges = function() {
    return [
      [6, 2], [2, 3], [3, 7], [7, 6], [6, 3], // top
      [4, 0], [0, 1], [1, 5], [5, 4], [4, 1], // bottom
      [6, 4], [4, 7], [7, 5], [5, 3], [3, 1], [1, 2], [2, 0], [0, 6] // sides
    ];
  }

  return Solid;

})();
