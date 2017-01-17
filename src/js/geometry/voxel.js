'use strict';

const _        = require('lodash');
const THREE    = require('three');

const bind     = require('../misc/bind');
const Beam     = require('./beam');
const Triangle = require('./triangle');
const Solid    = require('./solid');
const Wall     = require('./wall');

module.exports = (function() {

  function Voxel(position, voxelGrid, buffer, features, direction, stiffness) {
    bind(this);

    this.position = position;
    this.voxelGrid = voxelGrid;
    this.buffer = buffer;
    this.stiffness = stiffness || 0.01;

    this.elements = [];
    this.directions = [false,false,false];

    this.vertices = [
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3( 0.5, -0.5, -0.5),
      new THREE.Vector3(-0.5,  0.5, -0.5),
      new THREE.Vector3( 0.5,  0.5, -0.5),
      new THREE.Vector3(-0.5, -0.5,  0.5),
      new THREE.Vector3( 0.5, -0.5,  0.5),
      new THREE.Vector3(-0.5,  0.5,  0.5),
      new THREE.Vector3( 0.5,  0.5,  0.5)
    ].map(function(vertex) {
      return vertex.add(this.position);
    }.bind(this));

    this.features = features || [ 'box' ];
    this.direction = typeof direction !== 'undefined' ? direction : -1;
    this.update(this.features, this.direction);
  }

  Voxel.featureVertices = {
    'box': [0,1,2,3,4,5,6,7],
    'top-edge': [2,3],
    'bottom-edge': [0,1],
    'left-edge': [0,2],
    'right-edge': [1,3],
    'pos-diagonal': [1,2],
    'neg-diagonal': [0,3],

    'top-right-triangle':[1,2,3],
    'top-left-triangle':[0,2,3],
    'bottom-left-triangle':[0,1,2],
    'bottom-right-triangle':[0,1,3]
  };

  Voxel.prototype.shiftFeatureVerticesTo = function (featureVertices, featureDirection){
    var returnVertices = [];
    if (featureDirection == 0){
      featureVertices.map(function (vertice) { // for every vertice
        switch (vertice) {
          case 0:
            vertice = 5;
            break;
          case 1:
            vertice = 1;
            break;
          case 2:
            vertice = 7;
            break;
          case 3:
            vertice = 3;
            break;
        }
        returnVertices.push(vertice);
      });
    } else if (featureDirection == 1) {
      featureVertices.map(function (vertice) { // for every vertice
        switch (vertice) {
          case 0:
            vertice = 6;
            break;
          case 1:
            vertice = 7;
            break;
          case 2:
            vertice = 2;
            break;
          case 3:
            vertice = 3;
            break;
        }
        returnVertices.push(vertice);
      });
    } else if (featureDirection == 2){
      featureVertices.map(function(vertice) { // for every vertice
        switch (vertice){
          case 0:
            vertice = 4;
            break;
          case 1:
            vertice = 5;
            break;
          case 2:
            vertice = 6;
            break;
          case 3:
            vertice = 7;
            break;
        }
        returnVertices.push(vertice);
      });
    }
    return returnVertices;
  };

  Voxel.prototype.edgeToWallVertices = function (featureVertices, featureDirection){
    var returnVertices = featureVertices;
    featureVertices.map(function (vertice) {
      if (featureDirection == 0){
        switch (vertice) {
          case 0:
            vertice = 1;
            break;
          case 1:
            vertice = 0;
            break;
          case 2:
            vertice = 3;
            break;
          case 3:
            vertice = 2;
            break;
          case 4:
            vertice = 5;
            break;
          case 5:
            vertice = 4;
            break;
          case 6:
            vertice = 7;
            break;
          case 7:
            vertice = 6;
            break;
        }
        returnVertices.push(vertice);
      } else if (featureDirection == 1) {
        switch (vertice) {
          case 0:
            vertice = 2;
            break;
          case 1:
            vertice = 3;
            break;
          case 2:
            vertice = 0;
            break;
          case 3:
            vertice = 1;
            break;
          case 4:
            vertice = 6;
            break;
          case 5:
            vertice = 7;
            break;
          case 6:
            vertice = 4;
            break;
          case 7:
            vertice = 5;
            break;
        }
        returnVertices.push(vertice);
      } else if (featureDirection == 2){
        switch (vertice){
          case 0:
            vertice = 4;
            break;
          case 1:
            vertice = 5;
            break;
          case 2:
            vertice = 6;
            break;
          case 3:
            vertice = 7;
            break;
          case 4:
            vertice = 0;
            break;
          case 5:
            vertice = 1;
            break;
          case 6:
            vertice = 2;
            break;
          case 7:
            vertice = 3;
            break;
        }
        returnVertices.push(vertice);
      }
    });
    return returnVertices;
  };

  Voxel.featureStore = {
    '0:left-edge': Wall.left,
    '0:top-edge': Wall.top,
    '0:right-edge': Wall.right,
    '0:bottom-edge': Wall.bottom,
    '0:pos-diagonal': Wall.posDiagonalX,
    '0:neg-diagonal': Wall.negDiagonalX,
    '0:top-left-triangle': Triangle.topLeftX,
    '0:top-right-triangle': Triangle.topRightX,
    '0:bottom-left-triangle': Triangle.bottomLeftX,
    '0:bottom-right-triangle': Triangle.bottomRightX,

    '1:left-edge': Wall.back,
    '1:top-edge': Wall.right,
    '1:right-edge': Wall.front,
    '1:bottom-edge': Wall.left,
    '1:pos-diagonal': Wall.posDiagonalY,
    '1:neg-diagonal': Wall.negDiagonalY,
    '1:top-left-triangle': Triangle.topLeftY,
    '1:top-right-triangle': Triangle.topRightY,
    '1:bottom-left-triangle': Triangle.bottomLeftY,
    '1:bottom-right-triangle': Triangle.bottomRightY,

    '2:left-edge': Wall.back,
    '2:top-edge': Wall.top,
    '2:right-edge': Wall.front,
    '2:bottom-edge': Wall.bottom,
    '2:pos-diagonal': Wall.posDiagonalZ,
    '2:neg-diagonal': Wall.negDiagonalZ,
    '2:top-left-triangle': Triangle.topLeftZ,
    '2:top-right-triangle': Triangle.topRightZ,
    '2:bottom-left-triangle': Triangle.bottomLeftZ,
    '2:bottom-right-triangle': Triangle.bottomRightZ
  };

  Voxel.prototype.remove = function() {
    this.elements.forEach(function(element) {
      element.remove();
    });
    this.elements = [];
  };

  Voxel.prototype.addElement = function(element) {
    const vertices = element.vertices.map(function(index) {
      return this.vertices[index];
    }.bind(this));

    this.elements.push(new element.element(this, vertices));
  };

  Voxel.prototype.usedVertices = function() {
    return _.values(this.elements).map(function(element) {
      return element.vertices;
    });
  };

  Voxel.prototype.edges = function() {
    return this.elements.map(function(element) {
      return element.edges();
    });
  };

  Voxel.prototype.update = function(features, direction) {
    // const oldVoxel = this;
    const oldFeatures = this.features;
    const oldDirections = this.directions;
    var oldDirection;
    if (this.featureDirection != undefined){
      oldDirection = this.featureDirection;
    } else{
      oldDirection = direction;
    }
    const oldFeatureVertices = this.featureVertices;

    this.voxelGrid.voxelsHaveChanged = true;
    this.remove();

    this.directions = oldDirections;
    if (this.direction >= 0){
      this.directions[direction] = true;
    } else{
      this.directions= [false,false,false];
    }

    if (features.length == 1 && features[0] == 'box') { //TODO change this, stored features will be vertices, not text
      this.color = new THREE.Color(0.4, 0.4, 0.4);
      this.addElement(Solid.solid);
      this.featureDirection = -1;
      this.featureVertices = [[0,1,2,3,4,5,6,7]];
      this.features = ['box'];
      this.directions = [false,false,false];
    } else if (features.length > 0) {
      var featureVertices = []; // list of the "2D" versions
      features.forEach(function(feature) {
        featureVertices.push(Voxel.featureVertices[feature]);
      }, this);
      this.featureDirection = direction;
      this.features = features; //save new features as vertices
      this.color = new THREE.Color().fromArray(this.directions.map(function(dir) {
        return dir ? 1.0 : 0.4;
      }));

      //generate new feature list by combining old and new features, make sure they are not double
      //"extrude" 2D featureVertices in featureDirection: make walls depending if was solid or wall there, etc.
      //e.g. in dir 0 --> +4
      //e.g. top-edge 2 3: +4 --> addWall with 2 3 6 7

      //todo: skip all the following if: going through all the same elements AND direction
      const _this = this;

      // GET OLD VERTICES
      var oldVertices = [];
      if (oldFeatureVertices != undefined){
         oldVertices = oldFeatureVertices;
      } else {
        oldFeatures.map(function (oldFeature) {
          oldFeature = Voxel.featureVertices[oldFeature];
          const oldEdgeVerticies = _this.shiftFeatureVerticesTo(oldFeature, oldDirection);
          // oldVertices.push(_this.correctVerticeDirection(_this.edgeToWallVertices(oldEdgeVerticies,oldDirection)));
          oldVertices.push(_this.edgeToWallVertices(oldEdgeVerticies,oldDirection));
        });
      }

      // GET NEW VERTICES
      var newVertices = [];
      featureVertices.map(function(vertice) {
        const edgeVerticies = _this.shiftFeatureVerticesTo(vertice, direction);
        // newVertices.push(_this.correctVerticeDirection(_this.edgeToWallVertices(edgeVerticies, direction)));
        newVertices.push(_this.edgeToWallVertices(edgeVerticies, direction));
      });

      // COMPARE NEW VS. OLD
      var newVerticeLists = {'walls':[], 'beams':[], 'triangles':[]};
      newVertices.map(function(newVerticesArray){
        oldVertices.map(function (oldVerticesArray) {
          var overlapVertices = [];
          newVerticesArray.map(function (newVertice) {
            oldVerticesArray.map(function (oldVertice) {
              if (newVertice == oldVertice){
                overlapVertices.push(newVertice);
              }
            });
          });
          if (overlapVertices.length == 3){
            newVerticeLists['beams'].push([overlapVertices[0],overlapVertices[1]]);
            newVerticeLists['beams'].push([overlapVertices[0],overlapVertices[2]]);
            newVerticeLists['beams'].push([overlapVertices[1],overlapVertices[2]]);
          }
          if (overlapVertices.length == 2){
            newVerticeLists['beams'].push(overlapVertices);
          } else if (overlapVertices.length == 4){
            newVerticeLists['walls'].push(overlapVertices);
          }  else if (overlapVertices.length == 6){
            newVerticeLists['triangles'].push(overlapVertices);
          }
        });
      });

      // ADD REMAINING VERTICES
      this.featureVertices = [];
      for (var key in newVerticeLists){
        newVerticeLists[key].map(function (verticeList) {
          if (key == 'beams'){ //verticeList.length == 2
            var canUseBeam = true;

            newVerticeLists['walls'].map(function(wallsVerticeList){
              if ((_.union(verticeList, wallsVerticeList).length == 4)){ // if both beam vertices in the wall
                canUseBeam = false;
              }
            });
            if (newVerticeLists['triangles'].length > 0){
              newVerticeLists['triangles'].map(function(triangleVerticeList){
                if ((_.union(verticeList, triangleVerticeList).length == 6)){ // if both beam vertices in the wall
                  canUseBeam= false;
                }
              });
            }

            // don't add duplicate beams
            _this.featureVertices.map(function(vertices){
              if ((_.union(verticeList, vertices).length == 2)){ // if both beam vertices are same
                canUseBeam = false;
              }
            });
            // add remaining beams
            if (canUseBeam){
              _this.addElement({ element: Beam, vertices: verticeList, id: 'custom' });
              _this.featureVertices.push(verticeList);
            }
          } else if (key == "walls"){ //verticeList.length == 4
            var canUseWall = true;
            // ignore walls contained completely within trianlges
            if (newVerticeLists['triangles'].length > 0){
              newVerticeLists['triangles'].map(function(triangleVerticeList){
                if ((_.union(verticeList, triangleVerticeList).length == 6)){ // if both beam vertices in the wall
                  canUseWall= false;
                }
              });
            }

            // don't add duplicate walls
            _this.featureVertices.map(function(vertices){
              if ((_.union(verticeList, vertices).length == 4)){ // if both beam vertices are same
                canUseWall = false;
              }
            });

            // add walls
            if (canUseWall){
              _this.addElement({ element: Wall, vertices: verticeList, id: 'custom' });
              _this.featureVertices.push(verticeList);
            }
          } else if (key == "triangles"){ //verticeList.length == 6
            // add walls
            // because unlike beams and walls, order of vertices is VERY important
            const fixedVerticeList = Triangle.prototype.reorderVertices(verticeList);
            if (verticeList != false){
              _this.addElement({ element: Triangle, vertices: fixedVerticeList, id: 'custom' });
              _this.featureVertices.push(verticeList);
            }
          }
        });
      }
    }

    this.buffer.setVoxelColor(this.position, this.color);

    if (features.length == 0){ // delete Voxels with no features (empty)
      this.voxelGrid.removeVoxel(this.position);
    }
  };

  const cubeCornerBeams = [[6,1],[7,0],[4,3],[5,2]]; // beams that creat diagnal accross the cube
  Voxel.prototype.isSolid = function() {
    if(this.featureDirection == -1){
      return true;
    } else{
      var wallCount = 0;
      var isTriangle = false;
      var tooManyWalls = false;

      var cornerBeams = [];
      var walls = [];

      this.featureVertices.map(function(verticesList){
        // console.log('checking for:',verticesList);
        if (verticesList.length == 6){
          isTriangle = true;
        } else if(verticesList.length == 4){
          wallCount+=1;
          walls.concat(verticesList);
          if (wallCount > 4){
            tooManyWalls = true;
          }
        } else if(verticesList.length == 2){
          cubeCornerBeams.map(function(beam){
            if(_.union(beam,verticesList).length == 2){
              cornerBeams.push(verticesList);
              // console.log(verticesList);
              // console.log('corner beams, post insertion',cornerBeams);
            }
          });
        }
      });
      if (isTriangle || tooManyWalls){
        return true;
      } else{
        // if no trianlges:

        if (cornerBeams.length > 0){
          // look for opposite sides with 8+ vertice connections
          if (wallCount > 2){
            return true;
          } if (wallCount == 2){
            if (_.union(walls[0],walls[1]) == 0){ // walls are on opposite sides
              return true;
            }
          } if (wallCount == 1){
            return true;
          }
        }
      }
    }
    return false;
  };

  Voxel.prototype.enhanceEdges = function() {
    if (this.features.length == 1 && this.featureDirection == 1) {
      const left = this.voxelGrid.voxelAtPosition(this.position.clone().add(new THREE.Vector3(-1.0, 0.0, 0.0)));
      const top = this.voxelGrid.voxelAtPosition(this.position.clone().add(new THREE.Vector3(0.0, 0.0, -1.0)));
      const right = this.voxelGrid.voxelAtPosition(this.position.clone().add(new THREE.Vector3(1.0, 0.0, 0.0)));
      const bottom = this.voxelGrid.voxelAtPosition(this.position.clone().add(new THREE.Vector3(0.0, 0.0, 1.0)));

      if (this.features[0] == 'neg-diagonal') {
        if (left && left.isSolid() || top && top.isSolid()) {
          this.addElement(Triangle.topLeftY);
        }
        if (right && right.isSolid() || bottom && bottom.isSolid()) {
          this.addElement(Triangle.bottomRightY);
        }
      } else if (this.features[0] == 'pos-diagonal') {
        if (right && right.isSolid() || top && top.isSolid()) {
          this.addElement(Triangle.topRightY);
        }
        if (left && left.isSolid() || bottom && bottom.isSolid()) {
          this.addElement(Triangle.bottomLeftY);
        }
      }
    }
  };

  Voxel.prototype.setStiffness = function(stiffness) {
    this.stiffness = stiffness;
    this.buffer.setVoxelStiffness(this.position, this.stiffness);
  };

  Voxel.prototype.setColor = function(color) {
    this.color = color;
    this.buffer.setVoxelColor(this.position, color);
  };

  Voxel.prototype.positionAsString = function(color) {
    return this.position.x+","+this.position.y+","+this.position.z
  };

  const directionalVertices = [ [[0,2,4,6],[1,3,5,7]],
                                [[2,3,6,7],[0,1,4,5]],
                                [[0,1,2,3],[4,5,6,7]]];

  Voxel.prototype.get2dFeaturesInDirection = function (direction, normalized) {
    var twoDFeatures = [];
    const _this = this;

    for (var i = 0; i < directionalVertices[direction].length; i++) {
      const directionalVerticeList = directionalVertices[direction][i];
      var planeVertices = [];

      for (var j = 0; j < this.featureVertices.length; j++) {
        const featureVerticeList = this.featureVertices[j];
        const planeFeature = _.intersection(featureVerticeList,directionalVerticeList);

        if (planeFeature.length == 4){
          if (normalized== true){
            return [[1,2,3,4]]
            // return 'solid';
          } else{
            twoDFeatures = planeFeature;
            return [twoDFeatures];
            // return 'solid';
          }
        }
        if (planeFeature.length > 1){
          planeVertices.push(planeFeature);
        }
      }
      if (planeVertices.length > twoDFeatures.length){
        // take the plane that has the most features (important if one side is deleted w/ shoot-through)
        twoDFeatures = planeVertices;
      }
    }
    if (normalized == true){
      var normalizedVertices = [];
      twoDFeatures.map(function (feature) {
        const normalizedFeature = _this.normalize2dFeatureInDirection(direction,feature);
        normalizedVertices.push(normalizedFeature);
      });
      return normalizedVertices;
    }
    return twoDFeatures;
  };

  Voxel.prototype.normalize2dFeatureInDirection = function (direction, twoDFeature) {
    var newFeature = [];

    twoDFeature.map(function (value) { // for each value in 2d feature
      if (direction == 0){
        switch (value){
          case 0:
            newFeature.push(3);
            break;
          case 1:
            newFeature.push(3);
            break;
          case 2:
            newFeature.push(0);
            break;
          case 3:
            newFeature.push(0);
            break;
          case 4:
            newFeature.push(2);
            break;
          case 5:
            newFeature.push(2);
            break;
          case 6:
            newFeature.push(1);
            break;
          case 7:
            newFeature.push(1);
            break;
        }
      } else if( direction ==1){
        switch (value){
          case 0:
            newFeature.push(0);
            break;
          case 1:
            newFeature.push(1);
            break;
          case 2:
            newFeature.push(0);
            break;
          case 3:
            newFeature.push(1);
            break;
          case 4:
            newFeature.push(3);
            break;
          case 5:
            newFeature.push(2);
            break;
          case 6:
            newFeature.push(3);
            break;
          case 7:
            newFeature.push(2);
            break;
        }
      } else{ // direction == 2
        switch (value){
          case 0:
            newFeature.push(3);
            break;
          case 1:
            newFeature.push(2);
            break;
          case 2:
            newFeature.push(0);
            break;
          case 3:
            newFeature.push(1);
            break;
          case 4:
            newFeature.push(3);
            break;
          case 5:
            newFeature.push(2);
            break;
          case 6:
            newFeature.push(0);
            break;
          case 7:
            newFeature.push(1);
            break;
        }
      }
    });

    return newFeature;
  };

  Voxel.prototype.getNormalizedPairs = function (normalizedFeatureArray) {
    var returnArray = [];
    for (var i = 0; i < normalizedFeatureArray.length; i++){
      for (var j = 0; j < normalizedFeatureArray.length; j++){
        if (j > i){
          // if joined by one vertice
          if (_.union(normalizedFeatureArray[i],normalizedFeatureArray[j]).length == 3){
            returnArray.push([normalizedFeatureArray[i],normalizedFeatureArray[j]]);
          }
        }
      }
    }

    return returnArray;
  };

  const featuresAsLines = [
    null,
    [0,1],
    [1,2],
    [2,3],
    [3,0],
    [3,1],
    [0,2]
  ];

  Voxel.prototype.getFeatureWallAsPair = function (wallValue) {
    return featuresAsLines[wallValue];
  };

  Voxel.prototype.getLineValue = function (normalizedFeature) {
    if (normalizedFeature.length == 2){
      for (var i = 1; i <= 6; i++){
        if (_.union(featuresAsLines[i],normalizedFeature).length == 2){
          // if the normalizedFeature matches the position in featureAsLines,
          // then its line value is that position
          return i;
        }
      }
    } else{
      return false;
    }
  };

  Voxel.prototype.getFeaturePairsAsLines = function (featurePairs) {
    var featurePairsAsLines = {'right':[],"accute":[]};
    const _this = this
    featurePairs.map(function(featuresArray){
      var featurePair = [];
      featuresArray.map(function (featureArray) {
        featurePair.push(_this.getLineValue(featureArray));
      });
      if (_.union([5,6],featurePair).length > 3){ // no diagnals used
        featurePairsAsLines.right.push(featurePair);
      } else{
        featurePairsAsLines.accute.push(featurePair);
      }
    });

    return featurePairsAsLines;
  };

  Voxel.prototype.getWallValue = function (wallDirection) {
    switch (wallDirection){
      case 1:
            return 1;
      case 2:
            return 1;
      case 3:
            return -1;
      case 4:
            return -1;
      case 5:
            return -1;
      case 6:
            return 1;
    }
  };

  Voxel.prototype.getNeighborPositionOnAxisInDirection = function (axis, wallDirection) {
    if (axis == 0){
      switch (wallDirection){
        case 1:
          return {'x':this.position.x+0,'y':this.position.y+1,'z':this.position.z};
        case 2:
          return {'x':this.position.x+0,'y':this.position.y+0,'z':this.position.z+1};
        case 3:
          return {'x':this.position.x,'y':this.position.y-1,'z':this.position.z};
        case 4:
          return {'x':this.position.x,'y':this.position.y+0,'z':this.position.z-1};
      }
    } else if(axis ==1 ){
      switch (wallDirection){
        case 1:
          return {'x':this.position.x,'y':this.position.y+0,'z':this.position.z-1};
        case 2:
          return {'x':this.position.x+1,'y':this.position.y+0,'z':this.position.z};
        case 3:
          return {'x':this.position.x+0,'y':this.position.y+0,'z':this.position.z+1};
        case 4:
          return {'x':this.position.x-1,'y':this.position.y+0,'z':this.position.z};
      }
    } else{ // axis == 2
      switch (wallDirection){
        case 1:
          return {'x':this.position.x+0,'y':this.position.y+1,'z':this.position.z};
        case 2:
          return {'x':this.position.x+1,'y':this.position.y+0,'z':this.position.z};
        case 3:
          return {'x':this.position.x,'y':this.position.y-1,'z':this.position.z};
        case 4:
          return {'x':this.position.x-1,'y':this.position.y+0,'z':this.position.z};
      }
    }
  };

  Voxel.prototype.getNeighborPositionOnAxisFromCorner = function (axis, corner) {
    if (axis == 0){
      switch (corner){
        case 0:
          return {'x':this.position.x+0,'y':this.position.y+1,'z':this.position.z-1};
        case 1:
          return {'x':this.position.x+0,'y':this.position.y+1,'z':this.position.z+1};
        case 2:
          return {'x':this.position.x+0,'y':this.position.y-1,'z':this.position.z+1};
        case 3:
          return {'x':this.position.x+0,'y':this.position.y-1,'z':this.position.z-1};
      }
    } else if(axis ==1 ){
      switch (corner){
        case 0:
          return {'x':this.position.x-1,'y':this.position.y+0,'z':this.position.z-1};
        case 1:
          return {'x':this.position.x+1,'y':this.position.y+0,'z':this.position.z-1};
        case 2:
          return {'x':this.position.x+1,'y':this.position.y+0,'z':this.position.z+1};
        case 3:
          return {'x':this.position.x-1,'y':this.position.y+0,'z':this.position.z+1};
      }
    } else{ // axis == 2
      switch (corner){
        case 0:
          return {'x':this.position.x-1,'y':this.position.y+1,'z':this.position.z};
        case 1:
          return {'x':this.position.x+1,'y':this.position.y+1,'z':this.position.z};
        case 2:
          return {'x':this.position.x+1,'y':this.position.y-1,'z':this.position.z};
        case 3:
          return {'x':this.position.x-1,'y':this.position.y-1,'z':this.position.z};
      }
    }
  };

  Voxel.prototype.lineAsFeature = function (featureLine) {
    return featuresAsLines[featureLine];
  };

  Voxel.prototype.coordinatesToString = function (position) {
    return position.x+","+position.y+","+position.z;
  };

  Voxel.prototype.markBad = function () {
    this.setColor(new THREE.Color(1, 0.75, 0.55));
    // this.buffer.setVoxelColor(this.position, this.color);
  };

  Voxel.prototype.wallDirectionToValue = function (wallDirection){
    switch (wallDirection){
      case 1:
            return 1;
      case 2:
            return 1;
      case 3:
            return -1;
      case 4:
            return -1;
      case 5:
            return -1;
      case 6:
            return 1;
    }
  };

  Voxel.prototype.getOppositeWall = function (wall) {
    var oppositeWall = wall-2;
    switch(oppositeWall){
      case -1:
        oppositeWall = 3;
        break;
      case 0:
        oppositeWall = 4;
        break;
    }
    return oppositeWall;

  };
  return Voxel;

})();
