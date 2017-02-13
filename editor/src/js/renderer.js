'use strict';

const THREE             = require('three');
const OrbitControls     = require('three-orbit-controls')(THREE);

const bind              = require('./misc/bind');

module.exports = (function() {

  function Renderer(voxelGridSize) {
    bind(this);

    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl', { antialias: true });

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context: this.gl });
    this.renderer.setClearColor(0xffffff);
    this.renderer.sortObjects = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize, false);

    // Create camera.
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.set(0.0, 20.0, 15.0);

    // Create orbit controls.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 0.2;
    this.controls.zoomSpeed = 0.5;
    this.controls.panSpeed = 0.5;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.4;

    // Create and populate scene.
    this.scene = new THREE.Scene();

    // Create light and add to scene.
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0.0, 20.0, 10.0);
    this.scene.add(light);

    // Create the grid and axes.
    this.coordinateSystem = new THREE.Object3D();
    var gridSize = Math.max(voxelGridSize.x, voxelGridSize.z);
    this.grid = new THREE.GridHelper(gridSize / 2, gridSize);
    this.coordinateSystem.add(this.grid);

    var xGeometry = new THREE.Geometry();
    xGeometry.vertices.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(voxelGridSize.x / 2, 0, 0)
    );
    var xAxis = new THREE.Line(xGeometry, new THREE.LineBasicMaterial({color: 0xff0000}));
    this.coordinateSystem.add(xAxis);

    var yGeometry = new THREE.Geometry();
    yGeometry.vertices.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, voxelGridSize.y, 0)
    );
    var yAxis = new THREE.Line(yGeometry, new THREE.LineBasicMaterial({color: 0x00ff00}));
    this.coordinateSystem.add(yAxis);

    var zGeometry = new THREE.Geometry();
    zGeometry.vertices.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, voxelGridSize.z / 2)
    );
    var zAxis = new THREE.Line(zGeometry, new THREE.LineBasicMaterial({color: 0x0000ff}));
    this.coordinateSystem.add(zAxis);

    this.scene.add(this.coordinateSystem);
  }

  Renderer.prototype.update = function() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  Renderer.prototype.onWindowResize = function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return Renderer;

})();
