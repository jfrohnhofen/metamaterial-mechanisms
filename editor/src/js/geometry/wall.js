'use strict';

const THREE        = require('three');

const bind         = require('../misc/bind');
const VoxelElement = require('./voxel_element');

module.exports = (function() {

  function Wall(vertices, buffer) {
    bind(this);
    VoxelElement.call(this, vertices, buffer);
  }

  Wall.front  = { element: Wall, vertices: [ 5, 1, 7, 3 ], id: 'wf' };
  Wall.back   = { element: Wall, vertices: [ 0, 4, 2, 6 ], id: 'wB' };
  Wall.left   = { element: Wall, vertices: [ 4, 5, 6, 7 ], id: 'wl' };
  Wall.right  = { element: Wall, vertices: [ 1, 0, 3, 2 ], id: 'wr' };
  Wall.top    = { element: Wall, vertices: [ 6, 7, 2, 3 ], id: 'wt' };
  Wall.bottom = { element: Wall, vertices: [ 5, 4, 1, 0 ], id: 'wb' };

  Wall.posDiagonalX = { element: Wall, vertices: [ 7, 6, 1, 0 ], id: 'dx+' };
  Wall.negDiagonalX = { element: Wall, vertices: [ 4, 5, 2, 3 ], id: 'dx-' };
  Wall.posDiagonalY = { element: Wall, vertices: [ 2, 0, 7, 5 ], id: 'dy+' };
  Wall.negDiagonalY = { element: Wall, vertices: [ 6, 4, 3, 1 ], id: 'dy-' };
  Wall.posDiagonalZ = { element: Wall, vertices: [ 6, 2, 5, 1 ], id: 'dz+' };
  Wall.negDiagonalZ = { element: Wall, vertices: [ 4, 0, 7, 3 ], id: 'dz-' };

  Wall.prototype = Object.create(VoxelElement.prototype);

  Wall.prototype.positionMatrix = function(thickness) {
    this.thickness = thickness || 0;
    const edgeLength = this.thickness + 1.0;
    const width = this.vertices[0].distanceTo(this.vertices[2]) * edgeLength;
    const height = this.vertices[0].distanceTo(this.vertices[1]) * edgeLength;
    return new THREE.Matrix4()
      .lookAt(this.vertices[0], this.vertices[1], this.vertices[2].clone().sub(this.vertices[0]))
      .scale(new THREE.Vector3(this.thickness, width, height))
      .setPosition(this.center);
  }

  Wall.prototype.offsetMatrix = function() {
    return new THREE.Matrix4()
      .lookAt(this.vertices[0], this.vertices[1], this.vertices[2].clone().sub(this.vertices[0]));
  }

  Wall.prototype.localEdges = function() {
    return [
      [0, 1], [1, 3], [3, 2], [2, 0], [0, 3]
    ];
  }

  Wall.prototype.buildRenderGeometry = function() {
    this.thickness = this.thickness/this.stiffnessFactor; //set to half so scaling of length works out nicely

    var beam = new THREE.BoxBufferGeometry(1.0, 1.0, 1.0);
    var member = new THREE.BoxBufferGeometry(2.0, 1.0, 0.35);

    return [beam, member];
  }

  return Wall;

})();
