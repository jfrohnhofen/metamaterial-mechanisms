'use strict';

const bind  = require('../misc/bind');
const VoxelTool  = require('./voxel_tool');

const THREE = require('three');

module.exports = (function() {

  function VoxelDeleteTool(renderer, voxelGrid) {
    bind(this);
    VoxelTool.call(this, renderer, voxelGrid);

    this.setCuboidMode(true, false);

    this.cursorBorder = 0.5;

    this.cursor.material.uniforms.color.value = new THREE.Color(0xffffff);
    this.cursor.material.uniforms.borderColor.value = new THREE.Color(0xdddddd);
    this.cursor.material.uniforms.tool.value = 1;
    this.cursor.material.uniforms.borderSize.value = this.cursorBorder / 2.0;
  }

  VoxelDeleteTool.prototype = Object.create(VoxelTool.prototype);

  VoxelDeleteTool.prototype.extrusionParametersFromIntersection = function(intersection) {
    return intersection.object.isPlane ? {
      startPosition: intersection.point.floor().addScalar(0.5),
      extrusionNormal: new THREE.Vector3(0.0, -1.0, 0.0)
    } : {
      startPosition: intersection.object.position.clone(),
      extrusionNormal: intersection.face.normal.clone()
    }
  }

  // This break the current selection and acts as a reset.
  // It is more like a hack.
  VoxelDeleteTool.prototype.reset = function() {
    this.setCuboidMode(true, false);
  }

  VoxelDeleteTool.prototype.extrusionLengthFromIntersection = function(intersection) {
    return Math.min(Math.round(intersection), 0.0);
  }

  VoxelDeleteTool.prototype.updateVoxel = function(position) {
    this.voxelGrid.removeVoxel(position);
    return [];
  }

  return VoxelDeleteTool;
  
})();
