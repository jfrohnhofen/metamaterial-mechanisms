'use strict';

const bind        = require('../misc/bind');
const VoxelTool   = require('./voxel_tool');
const THREE       = require('three');

module.exports = (function() {

  function VoxelAddTool(renderer, voxelGrid) {
    bind(this);
    VoxelTool.call(this, renderer, voxelGrid);

    this.setCuboidMode(true, false);
  }

  VoxelAddTool.prototype = Object.create(VoxelTool.prototype);

  VoxelAddTool.prototype.extrusionParametersFromIntersection = function(intersection) {
    return intersection.object.isPlane ? {
      startPosition: intersection.point.floor().addScalar(0.5),
      extrusionNormal: new THREE.Vector3(0.0, 1.0, 0.0)
    } : {
      startPosition: intersection.object.position.clone().add(intersection.face.normal),
      extrusionNormal: intersection.face.normal.clone()
    }
  }

  VoxelAddTool.prototype.extrusionLengthFromIntersection = function(intersection) {
    return Math.max(Math.round(intersection), 0.0);
  }

  // This break the current selection and acts as a reset.
  // It is more like a hack.
  VoxelAddTool.prototype.reset = function() {
    this.setCuboidMode(true, false);
  }

  VoxelAddTool.prototype.updateVoxel = function(position, features) {
    const voxel = this.voxelGrid.addVoxel(position, features, this.extrusionNormal.largestComponent(), this.stiffness);

    this.activeBrush.used = true;

    return [ voxel ];
  }

  return VoxelAddTool;

})();
