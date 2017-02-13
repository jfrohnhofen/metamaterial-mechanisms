'use strict';

const bind  = require('../misc/bind');
const Tool  = require('./tool');

const _     = require('lodash');
const THREE = require('three');

module.exports = (function() {

  function AnchorTool(renderer, voxelGrid) {
    bind(this);
    Tool.call(this, renderer);

    this.voxelGrid = voxelGrid;

    this.hideGrid = true;

    this.position = new THREE.Vector3();
    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 0.4, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xff4444,
        opacity: 0.7,
        transparent: true
      })
    );
    this.cursor.visible = false;
    this.scene.add(this.cursor);
  }

  AnchorTool.interactionRadius = 0.5;

  AnchorTool.prototype = Object.create(Tool.prototype);

  AnchorTool.prototype.mouseMoveUp = function() {
    this.position = _.minBy(this.vertices, function(vertex) {
      return this.raycaster.ray.distanceToPoint(vertex);
    }.bind(this));

    if (this.position && this.raycaster.ray.distanceToPoint(this.position) < AnchorTool.interactionRadius) {
      this.cursor.visible = true;
      this.cursor.position.copy(this.position);
    } else {
      this.cursor.visible = false;
      this.position = undefined;
    }
  }

  AnchorTool.prototype.mouseUp = function() {
    if (this.position) {
      this.voxelGrid.toggleAnchor(this.position);
    }
  }

  AnchorTool.prototype.activated = function() {
    this.vertices = this.voxelGrid.vertices();
    this.voxelGrid.showAnchors();
  }

  AnchorTool.prototype.deactivated = function() {
    this.voxelGrid.hideAnchors();
  }
  
  return AnchorTool;
  
})();
