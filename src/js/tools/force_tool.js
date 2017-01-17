'use strict';

const bind  = require('../misc/bind');
const Tool  = require('./tool');

const _     = require('lodash');
const THREE = require('three');

module.exports = (function() {

  function ForceTool(renderer, voxelGrid, simulation) {
    bind(this);
    Tool.call(this, renderer);

    this.voxelGrid = voxelGrid;
    this.simulation = simulation;

    this.hideGrid = true;

    this.loadVertex = null;
    this.forceVector = null;
    this.forceOffset = 0.0;
    this.force = 0.0;

    this.cursor = this.buildCursor();
    this.cursor.visible = false;

    this.scene.add(this.cursor);
  }

  ForceTool.interactionRadius = 1.0;

  ForceTool.prototype = Object.create(Tool.prototype);

  ForceTool.prototype.buildCursor = function() {
    const cursor = new THREE.Object3D();
    cursor.arrows = [0xaa2222, 0x22aa22, 0x2222aa].map(this.buildArrow);

    cursor.add(cursor.arrows[0]);
    cursor.add(cursor.arrows[1]);
    cursor.add(cursor.arrows[2]);

    return cursor;
  }

  ForceTool.prototype.buildArrow = function(color, axis) {
    const arrow = new THREE.Object3D();
    const material = new THREE.MeshPhongMaterial({ color: color, shading: THREE.SmoothShading });

    arrow.front = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.2, 0.4, 32, 1, false), material);
    arrow.back = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.0, 0.4, 32, 1, false), material);
    arrow.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 32, 1, true), material);

    arrow.front.position.y = 1.0;
    arrow.back.position.y = -1.0;

    const direction = new THREE.Vector3();
    direction.setComponent(axis, 1.0);
    const rotation = new THREE.Vector3();
    rotation.setComponent(2 - axis, Math.PI / [-2.0, 2.0, 2.0][axis]);
    arrow.direction = direction;
    arrow.rotation.setFromVector3(rotation);
    arrow.add(arrow.front);
    arrow.add(arrow.back);
    arrow.add(arrow.shaft);

    return arrow;
  }

  ForceTool.prototype.reset = function() {
    this.loadVertex = null;
    this.mouseMoveUp();
  }

  ForceTool.prototype.deformCursor = function() {
    if (!this.forceVector) {
      return;
    }

    const arrow = this.cursor.arrows[this.forceVector.largestComponent()];

    arrow.front.position.y = 1.0 + Math.max(this.force, 0.0);
    arrow.back.position.y = -1.0 + Math.min(this.force, 0.0);
    arrow.shaft.scale.y = 1.0 + Math.abs(this.force / 2.0);
    arrow.shaft.position.y = this.force / 2.0;
  }

  ForceTool.prototype.activated = function() {
    this.loadVertex = null;
    this.cursor.visible = false;
    this.vertices = _.values(this.voxelGrid.vertices());
    this.simulation.start();
    this.voxelGrid.showAnchors();
  }

  ForceTool.prototype.deactivated = function() {
    this.voxelGrid.hideAnchors();
  }

  ForceTool.prototype.mouseDown = function() {
    this.forceVector = this.forceVectorDirection();

    if (!this.loadVertex || !this.forceVector) {
      this.mouseMoveDown = null;
      return;
    }

    this.mouseMoveDown = this.simulate;
    this.forceOffset = this.forceVectorLength();
    this.simulation.start();
  }

  ForceTool.prototype.mouseUp = function() {
    if (this.loadVertex) {
      this.force = 0;
      this.deformCursor();
      this.forceVector = null;
      this.simulation.stop();
    } else {
      this.loadVertex = this.getLoadVertex();
      if (this.hasMoved || !this.loadVertex) {
        return;
      }
      this.cursor.visible = true;
      this.cursor.position.copy(this.loadVertex);
    }
  }

  ForceTool.prototype.getLoadVertex = function() {
    const closeVertices = _.filter(this.vertices, function(vertex) {
      return this.raycaster.ray.distanceToPoint(vertex) < ForceTool.interactionRadius;
    }.bind(this));

    return _.minBy(closeVertices, function(vertex) {
      return vertex.distanceTo(this.raycaster.ray.origin);
    }.bind(this));
  }

  ForceTool.prototype.mouseMoveUp = function() {
    if (this.loadVertex) {
      return;
    }

    const loadVertex = this.getLoadVertex();

    if (loadVertex) {
      this.cursor.visible = true;
      this.cursor.position.copy(loadVertex);
    } else {
      this.cursor.visible = false;
    }
  }

  ForceTool.prototype.forceVectorDirection = function() {
    const intersection = this.raycaster.intersectObject(this.cursor, true)[0];
    return intersection && intersection.object.parent.direction;
  }

  ForceTool.prototype.forceVectorLength = function() {
    const normal = this.forceVector.clone().cross(this.raycaster.ray.direction);
    const planeNormal = normal.cross(this.raycaster.ray.direction);
    return this.raycaster.ray.origin.clone().sub(this.loadVertex).dot(planeNormal) / this.forceVector.clone().dot(planeNormal);
  }

  ForceTool.prototype.simulate = function() {
    this.force = this.forceVectorLength() - this.forceOffset;
    this.deformCursor();
    this.simulation.simulate(this.forceVector.clone().multiplyScalar(this.force), this.loadVertex);
  }

  return ForceTool;

})();
