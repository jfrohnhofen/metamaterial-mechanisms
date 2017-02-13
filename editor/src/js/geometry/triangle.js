'use strict';

const THREE        = require('three');
const _            = require('lodash');

const bind         = require('../misc/bind');
const VoxelElement = require('./voxel_element');

module.exports = (function() {

  function Triangle(vertices, buffer) {
    bind(this);
    VoxelElement.call(this, vertices, buffer);
  }

  // almost working.
  Triangle.topLeftX = { element: Triangle, vertices: [ 7, 3, 5, 6, 2, 4 ], id: 'htlx' };
  Triangle.bottomRightX = { element: Triangle, vertices: [ 1, 5, 3, 0, 4 ], id: 'hbrx' };

  // Working
  Triangle.topRightX = { element: Triangle, vertices: [ 3, 1, 7, 2, 0, 6 ], id: 'htrx' };
  Triangle.bottomLeftX = { element: Triangle, vertices: [ 5, 7, 1, 4, 6, 0 ], id: 'hblx' };

  Triangle.topLeftY = { element: Triangle, vertices: [ 2, 3, 6, 0, 1, 4 ], id: 'htly' };
  Triangle.topRightY = { element: Triangle, vertices: [ 3, 7, 2, 1, 5, 0 ], id: 'htry' };
  Triangle.bottomLeftY = { element: Triangle, vertices: [ 6, 2, 7, 4, 0, 5 ], id: 'hbly' };
  Triangle.bottomRightY = { element: Triangle, vertices: [ 7, 6, 3, 5, 4, 1 ], id: 'hbry' };

  // It seems to work, but somebody should double check it.
  Triangle.topLeftZ = { element: Triangle, vertices: [ 6, 7, 4, 2, 3, 0 ], id: 'htlz' };
  Triangle.topRightZ = { element: Triangle, vertices: [ 7, 5, 6, 3, 1, 2 ], id: 'htrz' };
  Triangle.bottomLeftZ = { element: Triangle, vertices: [ 4, 6, 5, 0, 2, 1 ], id: 'hblz' };
  Triangle.bottomRightZ = { element: Triangle, vertices: [ 5, 4, 7, 1, 0, 3 ], id: 'hbrz' };

  Triangle.verticeList = [[ 3, 1, 7, 2, 0, 6 ],
                          [ 5, 7, 1, 4, 6, 0 ],
                          [ 2, 3, 6, 0, 1, 4 ],
                          [ 3, 7, 2, 1, 5, 0 ],
                          [ 6, 2, 7, 4, 0, 5 ],
                          [ 7, 6, 3, 5, 4, 1 ],
                          [ 6, 7, 4, 2, 3, 0 ],
                          [ 7, 5, 6, 3, 1, 2 ],
                          [ 4, 6, 5, 0, 2, 1 ],
                          [ 5, 4, 7, 1, 0, 3 ]];

  Triangle.prototype = Object.create(VoxelElement.prototype);

  Triangle.prototype.buildSimulationGeometry = function() {
    const position = this.positionMatrix().applyToVector3Array([
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
       0.5, -0.5,  0.5
    ]);

    const offset = this.offsetMatrix().applyToVector3Array([
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
       1.0, -1.0,  1.0
    ]);

    return this.voxel.buffer.addElement(this.voxel.color, {
      position: position,
      offset: offset
    });
  }

  Triangle.prototype.positionMatrix = function(thickness) {
    thickness = thickness || 0;
    const edgeLength = thickness + 1.0;
    const xAxis = this.vertices[1].clone().sub(this.vertices[0]);
    const yAxis = this.vertices[2].clone().sub(this.vertices[0]);
    const zAxis = this.vertices[3].clone().sub(this.vertices[0]);
    return new THREE.Matrix4()
      .makeBasis(xAxis, yAxis, zAxis)
      .scale(new THREE.Vector3(edgeLength, edgeLength, edgeLength))
      .setPosition(this.vertices[0].clone().multiplyScalar(2.0).add(xAxis).add(yAxis).add(zAxis).divideScalar(2.0));
  }

  Triangle.prototype.offsetMatrix = function() {
    const xAxis = this.vertices[1].clone().sub(this.vertices[0]);
    const yAxis = this.vertices[2].clone().sub(this.vertices[0]);
    const zAxis = this.vertices[3].clone().sub(this.vertices[0]);
    return new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  }

  Triangle.prototype.localEdges = function() {
    return [
      [0, 1], [1, 2], [2, 0], // top
      [3, 4], [4, 5], [5, 3], // bottom
      [0, 3], [3, 1], [1, 4], [4, 2], [2, 5], [5, 0] // sides
    ];
  }

  Triangle.prototype.reorderVertices = function (checkVertices) {
    var returnArray = false;
    Triangle.verticeList.map(function(correctVertices){
      const unionLength = _.union(correctVertices, checkVertices).length;
      if (unionLength == 6){ // all same vertices
        returnArray = correctVertices;
      }
    });
    return returnArray;
  };

  return Triangle;

})();
