'use strict';

const _     = require('lodash');
const THREE = require('three');

const bind  = require('../misc/bind');

module.exports = (function() {

  function GeometryBuffer(scene, voxelGridSize, elementCapacity) {
    bind(this);

    this.scene = scene;
    this.voxelGridSize = voxelGridSize;

    const minVoxelCapacity = this.voxelGridSize.x * this.voxelGridSize.y * this.voxelGridSize.z;
    this.voxelTextureSize = this.textureSize(minVoxelCapacity);
    this.voxelCapacity = this.voxelTextureSize * this.voxelTextureSize;

    const minVertexCapacity = (this.voxelGridSize.x + 1) * (this.voxelGridSize.y + 1) * (this.voxelGridSize.z + 1);
    this.vertexTextureSize = this.textureSize(minVertexCapacity);
    this.vertexCapacity = this.vertexTextureSize * this.vertexTextureSize;

    this.elementCapacity = elementCapacity;

    this.textures = this.prepareTextures();
    this.geometry = this.prepareGeometry();
    var materials = this.prepareMaterial();
    this.material = materials.simulation;
    this.renderMaterial = materials.render;

    this.simulationMesh = new THREE.Mesh(this.geometry, this.material);
    this.simulationMesh.visible = false;
    this.scene.add(this.simulationMesh);

    this.renderGeometries = new Set();
    this.renderGeometriesDirty = false;
    this.renderMesh = new THREE.Mesh();

    this.reset();
  }

  GeometryBuffer.prototype.update = function() {
    if (!this.renderGeometriesDirty) {
      return;
    }
    this.renderGeometriesDirty = false;

    const renderGeometry = new THREE.BufferGeometry();

    var vertexCount = 0;
    var indexCount = 0;
    this.renderGeometries.forEach(function(geometry) {
      vertexCount += geometry.attributes.position.count;
      indexCount += geometry.index.count;
    });

    renderGeometry.setIndex(new THREE.Uint32Attribute(new Uint32Array(indexCount), 1));
    renderGeometry.addAttribute('position', new THREE.Float32Attribute(new Float32Array(vertexCount * 3), 3));
    renderGeometry.addAttribute('voxel', new THREE.Float32Attribute(new Float32Array(vertexCount * 3), 3));

    vertexCount = 0;
    indexCount = 0;
    this.renderGeometries.forEach(function(geometry) {
      for(var i=0; i<geometry.attributes.position.count; ++i) {
        renderGeometry.attributes.voxel.array.set(geometry.color.toArray(), (vertexCount + i ) * 3);
      }
      renderGeometry.attributes.position.array.set(geometry.attributes.position.array, vertexCount * 3);
      var indices = _.map(geometry.index.array, function(index) {
        return index + vertexCount;
      });
      renderGeometry.index.array.set(indices, indexCount);
      vertexCount += geometry.attributes.position.count;
      indexCount += geometry.index.count;
    });

    this.scene.remove(this.renderMesh);
    this.renderMesh = new THREE.Mesh(renderGeometry, this.renderMaterial);
    this.scene.add(this.renderMesh);
  };

  GeometryBuffer.prototype.textureSize = function(capacity) {
    const minEdgeLength = Math.sqrt(capacity);
    const log2EdgeLength = Math.ceil(Math.log(minEdgeLength) / Math.log(2.0));
    return Math.pow(2.0, log2EdgeLength);
  }

  GeometryBuffer.prototype.reset = function() {
    this.elementCount = 0;
    this.elementEmptyList = [];

    this.vertexCount = 0;
    this.vertexEmptyList = [];
    this.vertexMap = {};

    this.geometry.drawRange.count = 0;
  }

  GeometryBuffer.prototype.prepareTextures = function() {
    const textures = {};

    textures.simulation = new THREE.DataTexture(
      new Float32Array(this.vertexCapacity * 4),
      this.vertexTextureSize,
      this.vertexTextureSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );

    textures.voxelAttributes = new THREE.DataTexture(
      new Float32Array(this.voxelCapacity * 4),
      this.voxelTextureSize,
      this.voxelTextureSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );

    return textures;
  }

  GeometryBuffer.prototype.prepareGeometry = function() {
    const attributeBufferSize = this.elementCapacity * 8;
    const indexBufferSize = this.elementCapacity * 36;

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.Uint32Attribute(new Uint32Array(indexBufferSize), 1));
    geometry.addAttribute('position', new THREE.Float32Attribute(new Float32Array(attributeBufferSize * 3), 3));
    geometry.addAttribute('offset', new THREE.Float32Attribute(new Float32Array(attributeBufferSize * 3), 3));
    geometry.addAttribute('voxel', new THREE.Float32Attribute(new Float32Array(attributeBufferSize * 3), 3));

    const elementIndex = [
      4, 7, 6,  7, 4, 5, // front
      1, 2, 3,  2, 1, 0, // back
      6, 3, 2,  3, 6, 7, // top
      0, 5, 4,  5, 0, 1, // bottom
      5, 3, 7,  3, 5, 1, // right
      0, 6, 2,  6, 0, 4  // left
    ];

    const index = geometry.index.array;
    for (var element = 0; element < this.elementCapacity; element++) {
      for (var offset = 0; offset < 36; offset++) {
        index[element * 36 + offset] = element * 8 + elementIndex[offset];
      }
    }

    return geometry;
  }

  GeometryBuffer.prototype.prepareMaterial = function() {
    const simulationMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        'voxelAttributes': { type: 't', value: this.textures.voxelAttributes },
        'simulation': { type: 't', value: this.textures.simulation },
        'simulate': { type: '1i', value: 0 },
        'userForce': { type: 'f', value: 0.0 },
        'simulatedForce': { type: 'f', value: 0.0 }
      },
      vertexShader: '#extension GL_OES_standard_derivatives : enable\n \
        precision highp float; \
        \
        uniform mat4      projectionMatrix; \
        uniform mat4      modelViewMatrix; \
        uniform sampler2D voxelAttributes; \
        uniform sampler2D simulation; \
        uniform float     userForce; \
        uniform float     simulatedForce; \
        uniform bool      simulate; \
        \
        attribute      vec3      position; \
        attribute      vec3      offset; \
        attribute      vec3      voxel; \
        \
        varying     vec3      color; \
        varying     vec3      viewPosition; \
        \
        vec3 voxelGridSize = vec3(' + this.voxelGridSize.x + '.0, ' + this.voxelGridSize.y + '.0, ' + this.voxelGridSize.z + '.0); \
        float voxelTextureSize = ' + this.voxelTextureSize + '.0; \
        float vertexTextureSize = ' + this.vertexTextureSize + '.0; \
        \
        vec2 textureCoords(vec3 position, float textureSize) { \
          float idx = position.x + \
            position.y * voxelGridSize.x + \
            position.z * voxelGridSize.x * voxelGridSize.y; \
          return vec2(fract(idx / textureSize), idx / (textureSize * textureSize)); \
        } \
        \
        void main() { \
          vec3 vertexOffset = vec3(voxelGridSize.x / 2.0, 0.0, voxelGridSize.z / 2.0); \
          vec2 simulationCoords = textureCoords(position + vertexOffset, vertexTextureSize); \
          vec3 simulationMovement = texture2D(simulation, simulationCoords).xyz - position; \
          vec3 simulationPosition = simulate ? position + simulationMovement * userForce / simulatedForce : position; \
          \
          color = voxel; \
          float thickness = 0.03; \
          \
          vec4 transformed = modelViewMatrix * vec4(simulationPosition + offset * thickness, 1.0); \
          viewPosition = -transformed.xyz; \
          gl_Position = projectionMatrix * transformed; \
        }',
      fragmentShader: '#extension GL_OES_standard_derivatives : enable\n \
        precision highp float; \
        \
        varying  vec3 color; \
        varying  vec3 viewPosition; \
        \
        void main() { \
          vec3 fdx = dFdx(viewPosition); \
          vec3 fdy = dFdy(viewPosition); \
          vec3 normal = normalize(cross(fdx, fdy)); \
          float dotNL = clamp(dot(normal, normalize(vec3(0.0, 0.5, 1.0))), 0.0, 1.0); \
          gl_FragColor = vec4((color * dotNL) * (color * dotNL) + 0.3 * color, 1.0); \
        }'
    });

    const renderMaterial = new THREE.RawShaderMaterial({
      vertexShader: '#extension GL_OES_standard_derivatives : enable\n \
        precision highp float; \
        \
        uniform mat4      projectionMatrix; \
        uniform mat4      modelViewMatrix; \
        uniform sampler2D voxelAttributes; \
        \
        attribute      vec3      position; \
        attribute      vec3      offset; \
        attribute      vec3      voxel; \
        \
        varying     vec3      color; \
        varying     vec3      viewPosition; \
        \
        void main() { \
          color = voxel; \
          \
          vec4 transformed = modelViewMatrix * vec4(position, 1.0); \
          viewPosition = -transformed.xyz; \
          gl_Position = projectionMatrix * transformed; \
        }',
      fragmentShader: '#extension GL_OES_standard_derivatives : enable\n \
        precision highp float; \
        \
        varying  vec3 color; \
        varying  vec3 viewPosition; \
        \
        void main() { \
          vec3 fdx = dFdx(viewPosition); \
          vec3 fdy = dFdy(viewPosition); \
          vec3 normal = normalize(cross(fdx, fdy)); \
          float dotNL = clamp(dot(normal, normalize(vec3(0.0, 0.5, 1.0))), 0.0, 1.0); \
          gl_FragColor = vec4((color * dotNL) * (color * dotNL) + 0.3 * color, 1.0); \
        }'
    });

    for (var uniform in simulationMaterial.uniforms) {
      GeometryBuffer.prototype.__defineSetter__(uniform, function(uniform) {
        return function(value) {
          simulationMaterial.uniforms[uniform].value = value;
        }
      }(uniform));
    }

    return {
      simulation: simulationMaterial,
      render: renderMaterial
    };
  }

  GeometryBuffer.prototype.startSimulation = function() {
    this.simulationMesh.visible = true;
    this.simulate = 1;
    this.renderMesh.visible = false;
  };

  GeometryBuffer.prototype.stopSimulation = function() {
    this.simulationMesh.visible = false;
    this.simulate = 0;
    this.renderMesh.visible = true;
  };

  GeometryBuffer.prototype.updateVertexIndices = function(vertices) {
    this.vertexIndices = vertices.map(this.globalVertexIndex);
  }

  GeometryBuffer.prototype.updateVertices = function(vertices) {
    const texture = this.textures.simulation;
    vertices = new Float32Array(vertices);

    this.vertexIndices.forEach(function(vertexIndex, index) {
      texture.image.data.set(vertices.subarray(index * 3, (index + 1) * 3), vertexIndex * 4);
    });

    texture.needsUpdate = true;
  }

  GeometryBuffer.prototype.updateRenderGeometry = function(oldGeometry, newGeometry) {
    _.forEach(oldGeometry, function(geometry) {
      this.renderGeometries.delete(geometry);
    }.bind(this));

    _.forEach(newGeometry, function(geometry) {
      this.renderGeometries.add(geometry);
    }.bind(this));

    this.renderGeometriesDirty = true;
  }

  GeometryBuffer.prototype.addElement = function(color, attributeBuffers, renderGeometry) {
    _.forEach(renderGeometry, function(geometry) {
      this.renderGeometries.add(geometry);
    }.bind(this));
    this.renderGeometriesDirty = true;

    const elementIndex = this.elementEmptyList.length ? this.elementEmptyList.pop() : this.elementCount++;

    if (elementIndex >= this.elementCapacity) {
      console.error('ElementBuffer has overflown.');
      this.elementCount--;
      return;
    }

    for (var attributeName in attributeBuffers) {
      const attribute = this.geometry.attributes[attributeName];
      attribute.array.set(attributeBuffers[attributeName], elementIndex * 8 * attribute.itemSize);
      attribute.needsUpdate = true;
    }

    const voxelData = color.toArray();
    const voxelAttribute = this.geometry.attributes.voxel;
    voxelAttribute.array.set(_.flatten(Array(8).fill(voxelData)), elementIndex * 8 * voxelAttribute.itemSize);
    voxelAttribute.needsUpdate = true;

    this.geometry.drawRange.count = this.elementCount * 36;
    return elementIndex;
  }

  GeometryBuffer.prototype.removeElement = function(elementIndex, renderGeometry) {
    _.forEach(renderGeometry, function(geometry) {
      this.renderGeometries.delete(geometry);
    }.bind(this));
    this.renderGeometriesDirty = true;

    this.elementEmptyList.push(elementIndex);

    for (var attributeName in this.geometry.attributes) {
      const attribute = this.geometry.attributes[attributeName];
      attribute.array.fill(0, elementIndex * 8 * attribute.itemSize, (elementIndex + 1) * 8 * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  GeometryBuffer.prototype.globalVoxelPosition = function(position) {
    return this.globalVertexPosition(position).addScalar(-0.5);
  }

  GeometryBuffer.prototype.globalVoxelIndex = function(position) {
    const globalPosition = this.globalVoxelPosition(position);
    return globalPosition.x +
           globalPosition.y * this.voxelGridSize.x +
           globalPosition.z * this.voxelGridSize.x * this.voxelGridSize.y;
  }

  GeometryBuffer.prototype.globalVertexPosition = function(position) {
    return new THREE.Vector3(
      position.x + (this.voxelGridSize.x / 2),
      position.y,
      position.z + (this.voxelGridSize.z / 2)
    );
  }

  GeometryBuffer.prototype.globalVertexIndex = function(position) {
    const globalPosition = this.globalVertexPosition(position);
    return globalPosition.x +
           globalPosition.y * this.voxelGridSize.x +
           globalPosition.z * this.voxelGridSize.x * this.voxelGridSize.y;
  }

  GeometryBuffer.prototype.setVoxelAttribute = function(position, offset, value) {
    const voxelIndex = this.globalVoxelIndex(position);
    this.textures.voxelAttributes.image.data.set(value, voxelIndex * 4 + offset);
    this.textures.voxelAttributes.needsUpdate = true;
  }

  GeometryBuffer.prototype.setVoxelColor = function(position, color) {
    this.setVoxelAttribute(position, 0, color.toArray());
  }

  GeometryBuffer.prototype.setVoxelStiffness = function(position, stiffness) {
    this.setVoxelAttribute(position, 3, [ stiffness ]);
  }

  return GeometryBuffer;

})();
