'use strict';

const bind  = require('../misc/bind');
const VoxelTool  = require('./voxel_tool');

const THREE = require('three');

module.exports = (function() {

  function VoxelEditTool(renderer, voxelGrid) {
    bind(this);
    VoxelTool.call(this, renderer, voxelGrid);

    this.cursor.material.uniforms.tool.value = 2;
    this.allowCube = false;

    this.setCuboidMode(true, false);
  }

  VoxelEditTool.prototype = Object.create(VoxelTool.prototype);

  VoxelEditTool.prototype.extrusionParametersFromIntersection = function(intersection) {
    return intersection.object.isPlane ? {
      startPosition: undefined
    } : {
      startPosition: intersection.object.position.clone(),
      extrusionNormal: intersection.face.normal.clone()
    }
  }

  VoxelEditTool.prototype.updateCursor = function() {
    this.cursor.scale.setComponent(this.extrusionComponent, 0.1);
    this.cursor.position.add(this.extrusionNormal.clone().multiplyScalar(0.7));
    this.cursor.material.uniforms.scale.value = this.cursor.scale;
    this.cursor.material.uniforms.rotatedMode.value = this.rotatedMode ? 1 : 0;
  }

  VoxelEditTool.prototype.updateVoxel = function(position, features, mirrorFactor) {
    var voxel;
    const direction = this.extrusionNormal.largestComponent();
    const extrusionNormal = this.extrusionNormal.clone();
    extrusionNormal.setComponent(direction, mirrorFactor * extrusionNormal.getComponent(direction));

    const voxels = [];

    while ((voxel = this.voxelGrid.voxelAtPosition(position)) && (!this.mirror[direction] ||  mirrorFactor * position.getComponent(direction) > 0)) {
      voxel.update(features, direction);
      voxel.setStiffness(this.stiffness);
      voxels.push(voxel);
      position.sub(extrusionNormal);
    }

    this.activeBrush.used = true;

    return voxels;
  }

  return VoxelEditTool;

})();
