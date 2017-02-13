'use strict';

const _     = require('lodash');
const $     = require('jquery');

const THREE = require('three');
//const jscad = require('jscad');

module.exports = (function() {

  function VoxelElement(voxel, vertices) {
    this.voxel = voxel;
    this.vertices = vertices;
    this.stiffnessFactor = 2; // stiffness ratio between members (thick part of beam) and hinges (thin part)

    this.center = this.vertices.reduce(function(sum, vertex) {
      return sum.add(vertex);
    }, new THREE.Vector3()).divideScalar(this.vertices.length);

    this.updateThickness();

    this.renderGeometry = this.buildRenderGeometry();
    this.transformRenderGeometry(this.renderGeometry);
  }

  VoxelElement.prototype.updateThickness = function() {
    const color = this.voxel.color.clone().addScalar(this.voxel.position.y / 20.0);
    const zFightingOffset = color.r * 0.00001 + color.g * 0.00002 + color.b * 0.00003;

    const cellSize = this.voxel.voxelGrid.cellSize;

    const maxThickness = 1/2;
    const minThickness = this.voxel.voxelGrid.minThickness / cellSize * this.stiffnessFactor;

    //FIXME doesn't represent stiffness, because stiffness increases to the power of 4 with thickness
    this.thickness = (maxThickness-minThickness) * this.voxel.stiffness + minThickness + zFightingOffset;
  }

  VoxelElement.prototype.remove = function() {
    this.voxel.buffer.removeElement(this.bufferIndex, this.renderGeometry);
  }

  VoxelElement.prototype.buildRenderGeometry = function() {
    return [new THREE.BoxBufferGeometry(1.0, 1.0, 1.0)];
  }

  VoxelElement.prototype.transformRenderGeometry = function(renderGeometry) {
    const color = this.voxel.color.clone().addScalar(this.voxel.position.y / 20.0);

    _.forEach(renderGeometry, function(geometry) {
      geometry.applyMatrix(this.positionMatrix(this.thickness));
      geometry.color = color;
    }.bind(this));

    this.bufferIndex = this.buildSimulationGeometry();
  }

  VoxelElement.prototype.buildSimulationGeometry = function() {
    const position = this.positionMatrix().applyToVector3Array([
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5,
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
       0.5,  0.5,  0.5
    ]);

    const offset = this.offsetMatrix().applyToVector3Array([
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0
    ]);

    const voxel = [

    ]

    return this.voxel.buffer.addElement(this.voxel.color, {
      position: position,
      offset: offset
    }, this.renderGeometry);
  }

VoxelElement.prototype.updateRenderGeometry = function() {
    const newRenderGeometry = this.buildRenderGeometry();
    this.transformRenderGeometry(newRenderGeometry);
    this.voxel.buffer.updateRenderGeometry(this.renderGeometry, newRenderGeometry);
    this.renderGeometry = newRenderGeometry;
  }

  VoxelElement.prototype.edges = function() {
    return this.localEdges().map(function(edge) {
      return {
        vertices: [
          this.vertices[edge[0]],
          this.vertices[edge[1]]
        ],
        stiffness: this.voxel.stiffness
      };
    }.bind(this));
  }

  return VoxelElement;

})();
