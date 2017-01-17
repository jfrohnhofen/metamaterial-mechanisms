'use strict';

const bind  = require('../misc/bind');

const _     = require('lodash');
const $     = require('jquery');
const THREE = require('three');

module.exports = (function() {

  function Tool(renderer) {
    this.renderer = renderer;

    this.domElement = this.renderer.renderer.domElement;
    this.keys = {};

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Object3D();
    this.scene.visible = false;
    this.renderer.scene.add(this.scene);

    this.infoBox = $('#voxel-info-box');
  }

  Tool.prototype.activate = function() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mousewheel', this.onMouseWheel);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onWindowResize);

    this.scene.visible = true;

    this.renderer.coordinateSystem.visible = !this.hideGrid;
    
    this.activated();
    this.reset();
  }

  Tool.prototype.deactivate = function() {
    this.deactivated();

    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mousewheel', this.onMouseWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onWindowResize);

    this.scene.visible = false;
  }

  Tool.prototype.update = function(evt) {
    this.raycaster.setFromCamera(this.mouse, this.renderer.camera);
    
    if (evt.buttons) {
      this.hasMoved = true;
      if (this.mouseMoveDown) {
        this.mouseMoveDown();
        evt.stopPropagation();
      }
    } else {
      this.mouseMoveUp();
    }
  }

  Tool.prototype.onMouseDown = function(evt) {
    this.hasMoved = false;
    this.mouseDown(evt.buttons);
  }

  Tool.prototype.onMouseUp = function(evt) {
    this.mouseUp(evt.buttons);
  }

  Tool.prototype.onMouseMove = function(evt) {
    this.mouse.set(
      (evt.clientX / window.innerWidth) * 2 - 1,
      -(evt.clientY / window.innerHeight) * 2 + 1
    );
    this.update(evt);
  }

  Tool.prototype.onMouseWheel = function(evt) {
    this.update(evt);
  }

  Tool.prototype.onWindowResize = function(evt) {
    this.update(evt);
  }

  Tool.prototype.onKeyDown = function(evt) {
    if (this.keys[evt.keyCode]) {
      return;
    }

    if (evt.keyCode == 27) {
      this.reset();
    }

    this.keys[evt.keyCode] = true;
    this.keyDown(evt.keyCode);
  }

  Tool.prototype.onKeyUp = function(evt) {
    this.keys[evt.keyCode] = false;
    this.keyUp(evt.keyCode);
  }

  Tool.prototype.activated = 
  Tool.prototype.deactivated = 
  Tool.prototype.reset =
  Tool.prototype.mouseDown =
  Tool.prototype.mouseUp =
  Tool.prototype.mouseMoveUp =
  Tool.prototype.keyDown =
  Tool.prototype.keyUp =
    function() {}
  
  return Tool;
  
})();
