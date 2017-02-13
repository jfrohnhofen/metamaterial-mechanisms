'use strict';

const bind  = require('../misc/bind');
const VoxelTool  = require('./voxel_tool');

const _     = require('lodash');
const THREE = require('three');

module.exports = (function() {

  function VoxelSmoothingTool(renderer, voxelGrid) {
    bind(this);
    VoxelTool.call(this, renderer, voxelGrid);

    // changing coursor to be a sphere.
    var newGeom = new THREE.SphereGeometry( 0.4, 64, 64 );
    this.cursor.geometry = newGeom;
    this.cursor.geometry.needsUpdate = true;
    // changes colors based on dimension. 3 stands for this mode.
    this.cursor.material.uniforms.tool.value = 3;

    this.allowCube = false;

    var line, geometry, material;
    var collectedVoxels = new Set();

    this.alternativeMouseDown = this.mouseDown;
    this.alternativeMouseMoveDown = this.mouseMoveDown;
    this.alternativeMouseUp = this.mouseUp;

    // Why do I have to define it here?
    this.mouseDown = function() {
      this.cursor.visible = false;
      collectedVoxels.clear();
      renderer.controls.enabled = false;

      const intersectionVoxels = _.values( this.voxelGrid.intersectionVoxels );
      const intersection = this.raycaster.intersectObjects( intersectionVoxels )[0];
      if( intersection ) {
        renderer.scene.remove( line );
        collectedVoxels.add( intersection.object.position );

        let colorBasedOnDimension;
        const direction = this.extrusionNormal.largestComponent();

        if (direction === 0) colorBasedOnDimension = 0x880000;
        if (direction === 1) colorBasedOnDimension = 0x008800;
        if (direction === 2) colorBasedOnDimension = 0x000088;

        material = new THREE.LineBasicMaterial({ color: colorBasedOnDimension, linewidth: 10 }); 
        geometry = new THREE.Geometry();
        const newVertex = intersection.point.clone().add( this.extrusionNormal.clone() .multiplyScalar( 0.1 ) );
        geometry.vertices.push( newVertex );
        line = new THREE.Line( geometry, material ) 
        renderer.scene.add( line );
      }
    };

    this.mouseMoveDown = function() {

      const intersectionVoxels = _.values( this.voxelGrid.intersectionVoxels );
      const intersection = this.raycaster.intersectObjects( intersectionVoxels )[0];
      if( intersection ) {
        renderer.scene.remove( line );
        collectedVoxels.add( intersection.object.position );

        var vertices = geometry.vertices;
        const newVertex = intersection.point.clone().add( this.extrusionNormal.clone() .multiplyScalar( 0.1 ) );
        vertices.push( newVertex );

        geometry = new THREE.Geometry();
        geometry.vertices = vertices;
        line = new THREE.Line( geometry, material );
        renderer.scene.add( line );
      }
    };

    this.mouseUp = function() {
      renderer.controls.enabled = true;

      // for some strange reason, I couldn't iterate over the set.
      var collectedVoxelsAsArray = Array.from( collectedVoxels );
      for( var i = 0; i < collectedVoxelsAsArray.length; i++ ) {
        this.adjustAllVoxelsAtPositionAndBeyond( collectedVoxelsAsArray[i] );
      }

      renderer.scene.remove( line );
    };
  }

  VoxelSmoothingTool.prototype = Object.create(VoxelTool.prototype);

  VoxelSmoothingTool.prototype.extrusionParametersFromIntersection = function(intersection) {
    return intersection.object.isPlane ? {
      startPosition: undefined
    } : {
      startPosition: intersection.object.position.clone(),
      extrusionNormal: intersection.face.normal.clone()
    }
  }

  VoxelSmoothingTool.prototype.updateCursor = function() {
    this.cursor.scale.setComponent(this.extrusionComponent, 0.1);
    this.cursor.position.add(this.extrusionNormal.clone().multiplyScalar(0.7));
    this.cursor.material.uniforms.scale.value = this.cursor.scale;
    this.cursor.material.uniforms.rotatedMode.value = this.rotatedMode ? 1 : 0;
  }

  VoxelSmoothingTool.prototype.adjustAllVoxelsAtPositionAndBeyond = function( position ) {
    const extrusionNormal = this.extrusionNormal.clone();
    var iterateOverPosition = position.clone();

    while( !this.voxelGrid.isFreeAtPosition( iterateOverPosition ) ) {
      this.adjustSingleVoxel( iterateOverPosition );
      iterateOverPosition.sub( extrusionNormal );
    }
  }

  VoxelSmoothingTool.prototype.adjustSingleVoxel = function( position ) {

      var voxel = this.voxelGrid.voxelAtPosition( position );
      const direction = this.extrusionNormal.largestComponent();
      var features;

      var neighbors = {};
      neighbors.top = position.clone();
      neighbors.bottom = position.clone();
      neighbors.left = position.clone();
      neighbors.right = position.clone();
      neighbors.topLeft = position.clone();
      neighbors.topRight = position.clone();
      neighbors.bottomLeft = position.clone();
      neighbors.bottomRight = position.clone();

      if( direction == 0 ) {
        // X dimension

        neighbors.top.y++;
        neighbors.bottom.y--;
        neighbors.left.z++;
        neighbors.right.z--;

        neighbors.topLeft.z++;
        neighbors.topLeft.y++;
        neighbors.topRight.z--;
        neighbors.topRight.y++;

        neighbors.bottomLeft.z++;
        neighbors.bottomLeft.y--;
        neighbors.bottomRight.z--;
        neighbors.bottomRight.y--;
      } else if( direction == 1 ) {
        // Y dimension

        neighbors.top.z--;
        neighbors.bottom.z++;
        neighbors.left.x--;
        neighbors.right.x++;

        neighbors.topLeft.x--;
        neighbors.topLeft.z--;
        neighbors.topRight.x++;
        neighbors.topRight.z--;

        neighbors.bottomLeft.x--;
        neighbors.bottomLeft.z++;
        neighbors.bottomRight.x++;
        neighbors.bottomRight.z++;
      } else if( direction == 2 ) {
        // Z dimension
        
        neighbors.top.y++;
        neighbors.bottom.y--;
        neighbors.left.x--;
        neighbors.right.x++;

        neighbors.topLeft.x--;
        neighbors.topLeft.y++;
        neighbors.topRight.x++;
        neighbors.topRight.y++;

        neighbors.bottomLeft.x--;
        neighbors.bottomLeft.y--;
        neighbors.bottomRight.x++;
        neighbors.bottomRight.y--;
      }

      neighbors.topIsFree = this.voxelGrid.isFreeAtPosition( neighbors.top );
      neighbors.bottomIsFree = this.voxelGrid.isFreeAtPosition( neighbors.bottom );
      neighbors.leftIsFree = this.voxelGrid.isFreeAtPosition( neighbors.left );
      neighbors.rightIsFree = this.voxelGrid.isFreeAtPosition( neighbors.right );
      neighbors.topLeftIsFree = this.voxelGrid.isFreeAtPosition( neighbors.topLeft );
      neighbors.topRightIsFree = this.voxelGrid.isFreeAtPosition( neighbors.topRight );
      neighbors.bottomLeftIsFree = this.voxelGrid.isFreeAtPosition( neighbors.bottomLeft );
      neighbors.bottomRightIsFree = this.voxelGrid.isFreeAtPosition( neighbors.bottomRight );

      // It looks complex, but it isn't. In each if clause, the first three expressions check whether it is even possible to cut out parts of the voxel. The other expressions check wheter the resulting cutted voxel 'docks' to at least 2 other neighboring voxels. This prevents from cutting voxels without any sense.
      if( neighbors.rightIsFree && neighbors.topIsFree && neighbors.topRightIsFree && ( ( !neighbors.leftIsFree && !neighbors.topLeftIsFree ) || ( !neighbors.bottomIsFree && !neighbors.bottomRightIsFree ) || ( !neighbors.leftIsFree && !neighbors.bottomIsFree ) ) )
        features = [ "bottom-left-triangle", "pos-diagonal" ];
      else if( neighbors.rightIsFree && neighbors.bottomIsFree && neighbors.bottomRightIsFree && ( ( !neighbors.leftIsFree && !neighbors.bottomLeftIsFree ) || ( !neighbors.topIsFree && !neighbors.topRightIsFree ) || ( !neighbors.leftIsFree && !neighbors.topIsFree ) ) )
        features = [ "top-left-triangle", "neg-diagonal" ];
      else if( neighbors.leftIsFree && neighbors.topIsFree && neighbors.topLeftIsFree && ( ( !neighbors.rightIsFree && !neighbors.topRightIsFree ) || ( !neighbors.bottomIsFree && !neighbors.bottomLeftIsFree ) || ( !neighbors.rightIsFree && !neighbors.bottomIsFree ) ) )
        features = [ "bottom-right-triangle", "neg-diagonal" ];
      else if( neighbors.leftIsFree && neighbors.bottomIsFree && neighbors.bottomLeftIsFree && ( ( !neighbors.rightIsFree && !neighbors.bottomRightIsFree ) || ( !neighbors.topIsFree && !neighbors.topLeftIsFree ) || ( !neighbors.rightIsFree && !neighbors.topIsFree ) ) )
        features = [ "top-right-triangle", "pos-diagonal" ];

      // only update when stuff has changed
      if( features !== undefined )
        voxel.update(features, direction);
      
  }

  return VoxelSmoothingTool;
  
})();
