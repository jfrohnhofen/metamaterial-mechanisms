'use strict';

const bind  = require('../misc/bind');
const Tool  = require('./tool');
// const addBorderingIfNeeded = require('./bordering');

const $     = require('jquery');
const _     = require('lodash');
const THREE = require('three');

module.exports = (function() {

  function VoxelTool(renderer, voxelGrid) {
    Tool.call(this, renderer);

    this.voxelGrid = voxelGrid;
    this.startPosition = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();

    this.extrusionNormal = new THREE.Vector3();
    this.extrusionComponent = 0;

    this.allowCube = true;
    this.cursorBorder = 0.0;
    this.stiffness = 0.01;

    this.minPosition = new THREE.Vector3(
      -(this.voxelGrid.size.x / 2 - 0.5),
      0.5,
      -(this.voxelGrid.size.z / 2 - 0.5)
    );
    this.maxPosition = new THREE.Vector3(
      this.voxelGrid.size.x / 2 - 0.5,
      this.voxelGrid.size.y - 0.5,
      this.voxelGrid.size.z / 2 - 0.5
    );

    this.cursor = this.buildCursor();
    this.cursor.visible = false;
    this.scene.add(this.cursor);

    // this.setCuboidMode(false, false);
    this.setCuboidMode(true, false);

    this.mirror = [false, false, false];
  }

  VoxelTool.prototype = Object.create(Tool.prototype);

  VoxelTool.prototype.setMirrorMode = function(mirrorMode) {
    this.mirror = [mirrorMode, false, false];
  }

  VoxelTool.prototype.buildCursor = function() {
    const geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const material = new THREE.RawShaderMaterial({
      transparent: true,
      uniforms: {
        'scale': { type: 'v3', value: new THREE.Vector3(1.0, 1.0, 1.0) },
        'color': { type: 'c', value: new THREE.Color(0x444444) },
        'borderColor': { type: 'c', value: new THREE.Color(0x666666) },
        'borderSize': { type: 'f', value: 0.0 },
        'rotatedMode': { type: 'i', value: 0 },
        'rotatedScale': { type: 'f', value: 0.0 },
        'rotatedHeight': { type: 'f', value: 0.0 },
        'rotatedDirection': { type: 'i', value: 0 },
        'image': { type: 't', value: new THREE.Texture() },
        'tool': { type: 'i', value: 0 }
      },
      vertexShader: '\
        precision highp float; \
        precision highp int; \
        \
        uniform mat4      projectionMatrix; \
        uniform mat4      modelViewMatrix; \
        uniform vec3      scale; \
        uniform float     borderSize; \
        uniform int       rotatedMode; \
        uniform float     rotatedScale; \
        uniform float     rotatedHeight; \
        uniform int       rotatedDirection; \
        \
        attribute      vec3      position; \
        attribute      vec3      normal; \
        varying     vec2      texCoords; \
        varying     float     upside; \
        \
        void main() { \
          if (rotatedDirection == 0) { \
            upside = abs(normal.x); \
          } else if(rotatedDirection == 1) { \
            upside = abs(normal.y); \
          } else { \
            upside = abs(normal.z); \
          } \
          if (rotatedMode == 1) { \
            if (rotatedDirection == 0) { \
              texCoords = position.yz; \
            } else if(rotatedDirection == 1) { \
              texCoords = position.xz; \
            } else { \
              texCoords = position.xy; \
            } \
            if (upside == 0.0) { \
              if (abs(normal.x) == 1.0) { \
                texCoords = position.zy; \
              } else if(abs(normal.y) == 1.0) { \
                texCoords = position.xz; \
              } else { \
                texCoords = position.xy; \
              } \
            }\
            \
            if (texCoords.x < 0.0 && texCoords.y < 0.0) { \
              if (upside == 1.0) { \
                texCoords = vec2(-(rotatedScale + borderSize), 0.0); \
              } else { \
                texCoords = vec2(-borderSize, -borderSize); \
              } \
            } else if (texCoords.y < 0.0) { \
              if (upside == 1.0) { \
                texCoords = vec2(0.0, -(rotatedScale + borderSize)); \
              } else { \
                texCoords = vec2(-borderSize, rotatedScale + borderSize); \
              } \
            } else if (texCoords.x < 0.0) { \
              if (upside == 1.0) { \
                texCoords = vec2(0.0, rotatedScale + borderSize); \
              } else { \
                texCoords = vec2(rotatedHeight + borderSize, -borderSize); \
              } \
            } else { \
              if (upside == 1.0) { \
                texCoords = vec2(rotatedScale + borderSize, 0.0); \
              } else { \
                texCoords = vec2(rotatedHeight + borderSize, rotatedScale + borderSize); \
              } \
            } \
            if (upside == 1.0) { \
              texCoords.x += 1.0 + 2.0 * fract(rotatedScale / 2.0); \
              texCoords *= 0.5; \
            } \
          } else { \
            float cursorBorder = 0.25; \
            vec3 scaled = (position + 0.5) * scale - borderSize; \
            if (abs(normal.x) == 1.0) { \
              texCoords = vec2(-scaled.z, scaled.y); \
            } else if(abs(normal.y) == 1.0) { \
              texCoords = vec2(scaled.x, -scaled.z); \
            } else { \
              texCoords = scaled.xy; \
            } \
          } \
          \
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); \
        }',
      fragmentShader: '\
        precision highp float; \
        precision highp int; \
        \
        uniform vec3      color; \
        uniform vec3      borderColor; \
        uniform sampler2D image; \
        uniform int       tool; \
        uniform int       rotatedDirection; \
        \
        varying      vec2      texCoords; \
        varying      float     upside; \
        \
        void main() { \
          vec2 coords = fract(texCoords); \
          if (tool == 0) { \
            vec3 baseColor = upside == 1.0 ? texture2D(image, coords).xzy : ((coords.x <= 0.03 || coords.y <= 0.03 || coords.x >= 0.97 || coords.y >= 0.97) ? borderColor : color); \
            gl_FragColor = vec4(baseColor, 1.0); \
          } else if (tool == 1) { \
            vec3 baseColor = ((coords.x <= 0.03 || coords.y <= 0.03 || coords.x >= 0.97 || coords.y >= 0.97) ? borderColor : color); \
            gl_FragColor = vec4(baseColor, 0.7); \
          } else { \
            vec3 baseColor; \
            if (tool == 2) { \
              baseColor = upside == 1.0 ? texture2D(image, coords).xzy : ((coords.x <= 0.03 || coords.y <= 0.03 || coords.x >= 0.97 || coords.y >= 0.97) ? borderColor : color); \
            } else if( tool == 3) { \
              baseColor = ((coords.x <= 0.03 || coords.y <= 0.03 || coords.x >= 0.97 || coords.y >= 0.97) ? borderColor : color); \
            } \
            if (rotatedDirection == 0) {\
              baseColor.r *= 2.0; \
              baseColor.g = 0.0; \
              baseColor.b = 0.0; \
            } else if (rotatedDirection == 1) { \
              baseColor.g *= 2.0; \
              baseColor.r = 0.0; \
              baseColor.b = 0.0; \
            } else { \
              baseColor.b *= 2.0; \
              baseColor.r = 0.0; \
              baseColor.g = 0.0; \
            } \
            gl_FragColor = vec4(baseColor, 1.0); \
          } \
        }'
    });

    const cursor = new THREE.Mesh(geometry, material);
    return cursor;
  }

  VoxelTool.prototype.setCuboidMode = function(cuboidMode) {
    this.cuboidMode = cuboidMode;

    if (this.cuboidMode) {
      this.mouseMoveUp = this.processSingle;
      this.mouseMoveDown = this.processRect;

      if (this.allowCube) {
        this.mouseUp = function() {
          this.processRect();
          this.savedEndPosition = this.endPosition.clone();
          this.mouseMoveUp = this.processCube;
          this.mouseMoveDown = this.processCube;
          this.mouseUp = this.updateVoxelGrid;
        }.bind(this);
      } else {
        this.mouseUp = this.updateVoxelGrid;
      }
    } else {
      this.mouseMoveUp = this.processSingle;
      this.mouseMoveDown = null;
      this.mouseUp = this.updateVoxelGrid;
    }

    this.processSingle();
  }

  VoxelTool.prototype.processSingle = function() {
    const intersectionVoxels = _.values(this.voxelGrid.intersectionVoxels);
    const intersection = this.raycaster.intersectObjects(intersectionVoxels)[0];

    if (!intersection) {
      return;
    }

    _.extend(this, this.extrusionParametersFromIntersection(intersection));
    this.extrusionComponent = this.extrusionNormal.largestComponent();

    if (this.rotatedMode && this.startPosition) {
      this.startPosition.addScalar(0.5);
      this.startPosition.setComponent(this.extrusionComponent, this.startPosition.getComponent(this.extrusionComponent) - 0.5);
    }

    this.endPosition = this.startPosition;
    this.updateSelection();
  }

  VoxelTool.prototype.processRect = function() {
    if (!this.startPosition) {
      return;
    }

    const planeOffset = -this.startPosition.getComponent(this.extrusionComponent) * this.extrusionNormal.getComponent(this.extrusionComponent);
    const plane = new THREE.Plane(this.extrusionNormal, planeOffset);
    const intersection = this.raycaster.ray.intersectPlane(plane);

    if (intersection) {
      if (this.rotatedMode) {
        this.endPosition = intersection.clone().sub(this.startPosition).divideScalar(2.0).ceil().multiplyScalar(2.0);
        const rectDirection = this.endPosition.largestComponent();
        this.endPosition.setComponent((rectDirection + 1) % 3, 0.0);
        this.endPosition.setComponent((rectDirection + 2) % 3, 0.0);
        this.endPosition.add(this.startPosition);
      } else {
        this.endPosition = intersection.clone().sub(this.startPosition).round().add(this.startPosition);
      }
      this.updateSelection();
    }
  }

  VoxelTool.prototype.processCube = function() {
    const normal = this.extrusionNormal.clone().cross(this.raycaster.ray.direction);
    const intersectionNormal = normal.cross(this.raycaster.ray.direction);
    const intersection = this.raycaster.ray.origin.clone().sub(this.savedEndPosition).dot(intersectionNormal) / this.extrusionNormal.clone().dot(intersectionNormal);

    const extrusionLength = this.extrusionLengthFromIntersection(intersection) * this.extrusionNormal.getComponent(this.extrusionComponent);
    this.endPosition.setComponent(this.extrusionComponent, this.savedEndPosition.getComponent(this.extrusionComponent) + extrusionLength);
    this.updateSelection();
  }

  VoxelTool.prototype.updateSelection = function() {
    if (!this.startPosition || !this.endPosition) {
      this.cursor.visible = false;
      this.infoBox.hide();
      return;
    }

    this.startPosition.clamp(this.minPosition, this.maxPosition);
    this.endPosition.clamp(this.minPosition, this.maxPosition);

    const start = this.startPosition.clone().min(this.endPosition);
    const end = this.startPosition.clone().max(this.endPosition);


    this.cursor.visible = true;

    if (this.cuboidMode) {
      this.infoBox.show();
    } else {
      this.infoBox.hide();
    }

    if (this.rotatedMode) {
      this.cursor.position.copy(start.clone().add(end).divideScalar(2.0));

      const height = 1.0 + end.getComponent(this.extrusionComponent) - start.getComponent(this.extrusionComponent);
      start.setComponent(this.extrusionComponent, 0.0);
      end.setComponent(this.extrusionComponent, 0.0);
      const rotatedScale = (2.0 + start.distanceTo(end));
      const scale = rotatedScale / Math.sqrt(2.0);
      this.cursor.scale.setComponent(this.extrusionComponent, height + this.cursorBorder);
      this.cursor.scale.setComponent((this.extrusionComponent + 1) % 3, scale + this.cursorBorder);
      this.cursor.scale.setComponent((this.extrusionComponent + 2) % 3, scale + this.cursorBorder);

      const rotation = [0.0, 0.0, 0.0];
      rotation[this.extrusionComponent] = 45.0 / 180.0 * Math.PI;
      this.cursor.rotation.fromArray(rotation);

      this.cursor.material.uniforms.rotatedMode.value = 1;
      this.cursor.material.uniforms.rotatedScale.value = rotatedScale / 2.0;
      this.cursor.material.uniforms.rotatedHeight.value = height;
      this.cursor.material.uniforms.rotatedDirection.value = this.extrusionComponent;

      this.infoBox.html('size ' + [rotatedScale / 2, height, rotatedScale / 2].join(' x '));
    } else {
      this.cursor.position.copy(start.clone().add(end).divideScalar(2.0));
      this.cursor.scale.copy(end.clone().sub(start).addScalar(1.0 + this.cursorBorder));
      this.cursor.rotation.fromArray([0.0, 0.0, 0.0]);

      this.cursor.material.uniforms.scale.value.copy(this.cursor.scale);
      this.cursor.material.uniforms.rotatedMode.value = 0;
      this.cursor.material.uniforms.rotatedDirection.value = this.extrusionComponent;

      this.infoBox.html('size ' + this.cursor.scale.toArray().join(' x '));
    }

    this.updateCursor();
  }

  VoxelTool.prototype.updateCursor = function() {}

  VoxelTool.prototype.updateVoxelGrid = function() {
    if (!this.startPosition || !this.endPosition || !this.cuboidMode && this.hasMoved) {
      this.processSingle();
      return;
    }

    const start = this.startPosition.clone().min(this.endPosition);
    const end = this.startPosition.clone().max(this.endPosition);

    var updatedVoxels = [];

    if (this.rotatedMode) {
      const h = this.extrusionComponent;
      const u = (h + 1) % 3;
      const v = (h + 2) % 3;
      const radius = Math.abs(start.getComponent(u) + start.getComponent(v) - end.getComponent(u) - end.getComponent(v)) / 2.0 + 1.0;
      const height = end.getComponent(h) - start.getComponent(h) + 1.0;
      const center = start.clone().add(end).divideScalar(2.0);

      for (var du = 0; du < radius * 2; du++)
        for (var dv = 0; dv < radius * 2; dv++)
          for (var dh = 0; dh < height; dh++) {
            if (Math.abs(du - radius + 0.5) + Math.abs(dv - radius + 0.5) > radius) {
              continue;
            }

            const position = [0.0, 0.0, 0.0];
            position[u] = center.getComponent(u) - radius + 0.5 + du;
            position[v] = center.getComponent(v) - radius + 0.5 + dv;
            position[h] = start.getComponent(h) + dh;

            updatedVoxels = updatedVoxels.concat(
              this.updateSingleVoxel(new THREE.Vector3().fromArray(position), new THREE.Vector2(du + (radius + 1) % 2, dv))
            );
      }
    } else {
      for (var x = start.x; x <= end.x; x++)
        for (var y = start.y; y <= end.y; y++)
          for (var z = start.z; z <= end.z; z++) {
            updatedVoxels = updatedVoxels.concat(
              this.updateSingleVoxel(new THREE.Vector3(x, y, z), new THREE.Vector2(x - start.x, z - start.z))
            );
      }
    }

    updatedVoxels.forEach(function(voxel) {
      voxel.enhanceEdges();
    });

    this.voxelGrid.update();
    this.setCuboidMode(this.cuboidMode, this.rotatedMode);
    this.processSingle();
    // this.voxelGrid.highlightHinges();

    // this.voxelGrid.detectBadVoxels();
    // this.voxelGrid.highlightBadVoxels();
    // addBorderingIfNeeded( this );
  }

  VoxelTool.prototype.updateSingleVoxel = function(position, offset) {
    var positions = [ position.clone() ];
    var invalidPosition = false;

    this.mirror.forEach(function(mirror, axis) {
      if (!mirror) {
        return [];
      }

      positions = positions.concat(positions.map(function(position) {
        const mirroredPosition = position.clone();
        invalidPosition = invalidPosition || mirroredPosition.getComponent(axis) < 0;
        mirroredPosition.setComponent(axis, -mirroredPosition.getComponent(axis));
        return mirroredPosition;
      }));
    });

    if (invalidPosition) {
      return [];
    }

    const cellCoords = [offset.y % this.activeBrush.height, offset.x % this.activeBrush.width];
    const features = this.activeBrush.cells[cellCoords].mirroredFeatures;

    return _.flatten(positions.map(function(mirroredPosition) {
      const mirrorFactor = mirroredPosition.getComponent(this.extrusionComponent) / position.getComponent(this.extrusionComponent);
      var mirror = this.mirror.slice();
      if (this.mirror[this.extrusionComponent]) {
        mirror = [true, true, true];
        mirror[this.extrusionComponent] = false;
      }
      mirror = mirror.map(function(cur, idx) {
        return cur && mirroredPosition.getComponent(idx) != position.getComponent(idx);
      });

      return this.updateVoxel(mirroredPosition, features[mirror], mirrorFactor);
    }.bind(this)));
  }

  VoxelTool.prototype.__defineGetter__('activeBrush', function() {
    return this._activeBrush;
  });

  VoxelTool.prototype.__defineSetter__('activeBrush', function(activeBrush) {
    this._activeBrush = activeBrush;
    this.cursor.material.uniforms.image.value = new THREE.Texture(activeBrush.textureIcon);
    this.cursor.material.uniforms.image.value.needsUpdate = true;
  });

  VoxelTool.prototype.alterMouseEvents = function(){
    const oldouseMoveDown = this.mouseMoveDown;
    const oldouseDown = this.mouseDown;
    const oldouseUp = this.mouseUp;

    this.mouseMoveDown = this.alternativeMouseMoveDown;
    this.mouseDown = this.alternativeMouseDown;
    this.mouseUp = this.alternativeMouseUp;

    this.alternativeMouseMoveDown = oldouseMoveDown;
    this.alternativeMouseDown = oldouseDown;
    this.alternativeMouseUp = oldouseUp;
  }

  return VoxelTool;

})();
