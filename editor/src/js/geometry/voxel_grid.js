'use strict';

const _              = require('lodash');
const StlReader      = require('stl-reader');
const THREE          = require('three');
const voxelize       = require('voxelize');
const CSG            = require('openjscad-csg').CSG;

const GeometryBuffer = require('./geometry_buffer');
const Voxel          = require('./voxel');

module.exports = (function() {

  function VoxelGrid(scene, size, settings) {
    this.scene = scene;
    this.size = size;
    this.settings = settings;

    this.buffer = new GeometryBuffer(scene, this.size, 100000);

    this.intersectionVoxelGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.anchorGeometry = new THREE.SphereGeometry(0.35, 0.35, 0.35);
    this.anchorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    this.anchorParent = new THREE.Object3D();
    this.anchorParent.visible = false;
    this.scene.add(this.anchorParent);

    this.reset();
  }

  VoxelGrid.prototype.reset = function() {
    this.buffer.reset();

    this.voxels = {};
    this.badVoxels = {};
    this.anchors = {};

    this.intersectionVoxels = {};
    this.intersectionVoxels.plane = this.intersectionPlane();

    this.anchorParent.children.forEach(function(child) {
      this.anchorParent.remove(child);
    }, this);
  };

  VoxelGrid.prototype.import = function(stlFile, voxelDimensions) {
    var reader = new StlReader();
    var stlData = reader.read(stlFile);

    var positions = _.chunk(stlData.vertices, 3);
    var cells = _.chunk(_.range(positions.length), 3);
    var voxels = voxelize(cells, positions, voxelDimensions).voxels;

    this.reset();

    var modelSize = new THREE.Vector3(voxels.shape[0], voxels.shape[2], voxels.shape[1]);
    var offset = new THREE.Vector3((-modelSize.x >> 1) + 0.5, -0.5, (-modelSize.z >> 1) + 0.5);
    var stride = new THREE.Vector3().fromArray(voxels.stride);

    voxels.data.forEach(function(voxel, index) {
      if (voxel == 0) { return; }
      var position = new THREE.Vector3(
        Math.floor((index % stride.y) / stride.x),
        Math.floor(index / stride.z),
        Math.floor((index % stride.z) / stride.y)
      ).add(offset);
      this.addVoxel(position, ['box'], 0, 1);
    }.bind(this));
    this.update();
  };

  VoxelGrid.prototype.export = function() {
    const elementGeometry = this.buffer.renderMesh.geometry;
    const vertices = elementGeometry.attributes.position.array;
    const indices = elementGeometry.index.array;

    var polygons  = [];
    var csgVertices = [];

    for(var k = 0; k < indices.length; k++){
      if(k > 0 && k % 3 == 0){
        polygons.push(new CSG.Polygon(csgVertices));
        csgVertices = [];
      }

      var index = indices[k] * 3;
      csgVertices.push(new CSG.Vertex(new CSG.Vector3D(
        vertices[index] * this.cellSize,
        vertices[index+1] * this.cellSize,
        vertices[index+2] * this.cellSize
      )));
    }

    polygons.push(new CSG.Polygon(csgVertices));

    const exportScene = CSG.fromPolygons(polygons);
    return exportScene;
  };

  VoxelGrid.prototype.update = function() {
    this.buffer.update();
  };

  VoxelGrid.prototype.updateGridSettings = function(newThickness, newCellSize) {
    if(this.minThickness == newThickness && this.cellSize == newCellSize)
      return;

    this.minThickness = newThickness;
    this.cellSize = newCellSize;

    for (var key in this.voxels){
      const voxel = this.voxels[key];

      for(var i = 0; i < voxel.elements.length; i++) {
        var voxelElement = voxel.elements[i];

        voxelElement.updateThickness();
        voxelElement.updateRenderGeometry();
      }
    }

    this.update();
  };

  VoxelGrid.prototype.intersectionPlane = function() {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.size.x, this.size.z));
    plane.rotation.x = -Math.PI / 2.0;
    plane.isPlane = true;
    plane.updateMatrixWorld(true);
    return plane;
  };

  VoxelGrid.prototype.addVoxel = function(position, features, direction, stiffness) {
    this.removeVoxel(position);
    this.voxelsHaveChanged = true;
    this.addIntersectionVoxel(position);

    return this.voxels[position.toArray()] = new Voxel(position, this, this.buffer, features, direction, stiffness);
  };

  VoxelGrid.prototype.removeVoxel = function(position) {
    if (this.voxels[position.toArray()]) {
      this.voxelsHaveChanged = true;
      this.removeIntersectionVoxel(position);
      this.voxels[position.toArray()].remove();
      delete this.voxels[position.toArray()];
    }
  };

  VoxelGrid.prototype.voxelAtPosition = function(position) {
    return this.voxels[position.toArray()];
  };

  VoxelGrid.prototype.addIntersectionVoxel = function(position) {
    const voxel = new THREE.Mesh(this.intersectionVoxelGeometry);
    voxel.position.copy(position);
    voxel.updateMatrixWorld(true);
    this.intersectionVoxels[position.toArray()] = voxel;
  };

  VoxelGrid.prototype.removeIntersectionVoxel = function(position) {
    delete this.intersectionVoxels[position.toArray()];
  };

  VoxelGrid.prototype.addAnchor = function(position) {
    if (!this.anchors[position.toArray()]) {
      this.anchorsHaveChanged = true;
      const anchor = new THREE.Mesh(this.anchorGeometry, this.anchorMaterial);
      anchor.position.copy(position);
      this.anchors[position.toArray()] = anchor;
      this.anchorParent.add(anchor);
    }
  };

  VoxelGrid.prototype.removeAnchor = function(position) {
    if (this.anchors[position.toArray()]) {
      this.anchorsHaveChanged = true;
      this.anchorParent.remove(this.anchors[position.toArray()]);
      delete this.anchors[position.toArray()];
    }
  };

  VoxelGrid.prototype.toggleAnchor = function(position) {
    if (this.anchors[position.toArray()]) {
      this.removeAnchor(position);
    } else {
      this.addAnchor(position);
    }
  };

  VoxelGrid.prototype.showAnchors = function() {
    this.anchorParent.visible = true;
  };

  VoxelGrid.prototype.hideAnchors = function() {
    this.anchorParent.visible = false;
  };

  VoxelGrid.prototype.vertices = function() {
    const rawVertices = _.flattenDeep(_.values(this.voxels).map(function(voxel) {
      return voxel.usedVertices();
    }));
    return _.uniqWith(rawVertices, function(a, b) { return a.equals(b); });
  };

  VoxelGrid.prototype.edges = function() {
    return _.flattenDeep(_.values(this.voxels).map(function(voxel) {
      return voxel.edges();
    }));
  };

  VoxelGrid.prototype.simulationData = function() {
    const mesh = this.voxelsHaveChanged ? this.meshForSimulation() : null;
    const anchors = this.anchorsHaveChanged ? this.anchorsForSimulation() : null;

    this.voxelsHaveChanged = this.anchorsHaveChanged = false;

    return { mesh: mesh, anchors: anchors };
  };

  VoxelGrid.prototype.meshForSimulation = function() {
    /* vertices */
    const vertices = this.vertices();
    const vertexArray = [];

    const simulationIndices = {};

    vertices.forEach(function(vertex, index) {
      vertexArray.push(vertex.x, vertex.y, vertex.z);
      simulationIndices[vertex.toArray()] = index;
    }.bind(this));

    this.buffer.updateVertexIndices(vertices);

    /* edges */
    const edges = this.edges();
    const edgeArray = [];
    const stiffnessArray = [];
    const stiffnessMap = {};

    edges.forEach(function(edge) {
      const indices = [
        simulationIndices[edge.vertices[0].toArray()],
        simulationIndices[edge.vertices[1].toArray()]
      ];
      const hash = _.sortBy(indices);
      const edgeIndex = stiffnessMap[hash];

      if (edgeIndex == undefined) {
        stiffnessMap[hash] = edgeArray.length / 2;
        edgeArray.push(indices[0], indices[1]);
        stiffnessArray.push(edge.stiffness);
      } else {
        stiffnessArray[edgeIndex] = Math.max(stiffnessArray[edgeIndex], edge.stiffness);
      }
    });

    return { vertices: vertexArray, edges: edgeArray, stiffness: stiffnessArray };
  };

  VoxelGrid.prototype.anchorsForSimulation = function() {
    return _.flatten(_.values(this.anchors).map(function(anchor) {
      return anchor.position.toArray();
    }));
  };

  VoxelGrid.prototype.updateSimulation = function(vertices, simulatedForce) {
    this.buffer.updateVertices(vertices);
    this.buffer.startSimulation();
    this.buffer.simulatedForce = simulatedForce;
  };

  VoxelGrid.prototype.interpolateSimulation = function(force) {
    this.buffer.userForce = force;
  };

  VoxelGrid.prototype.stopSimulation = function() {
    this.buffer.stopSimulation();
  };

  VoxelGrid.prototype.isFreeAtPosition = function( position ) {
        return typeof this.voxelAtPosition( position ) === 'undefined';
  };


  VoxelGrid.prototype.highlightBadVoxels = function() {
    for (var key in this.badVoxels){
      this.badVoxels[key].markBad();
    }
  };

  VoxelGrid.prototype.detectBadVoxels = function() {
    // run in voxel tools at end of updateVoxelGrid()
    const _this = this; // necessary for using in loops because JS is a douche
    this.badVoxels = {};

    for (var voxelCoordinate in this.voxels) {
      const currentVoxel = this.voxels[voxelCoordinate];
      // reset current colors
      if (currentVoxel.color != undefined){
        currentVoxel.update(currentVoxel.features, currentVoxel.featureDirection);
      }

      if (!currentVoxel.isSolid()){
        //check these voxels in each dimension, where direction is true
        for (var i=0; i < 3; i++){
          const currentDirection = i;
          if (currentVoxel.directions[i] == true){// if shearable in the given direction
            // 0 = top left; 1 top righ; 2 bottom right; 3 bottom left;
            var normalizedFeatures = currentVoxel.get2dFeaturesInDirection(currentDirection,true); // true = normalized
            // get all feature pairs (lines that join at a vertice)
            var featurePairs = currentVoxel.getNormalizedPairs(normalizedFeatures);
            // get features as lines, which can work with
            var featurePairsAsLines = currentVoxel.getFeaturePairsAsLines(featurePairs);

            // todo: trim and add, to get effective angles for checking
            var checkWalls = [];

            featurePairsAsLines.accute.map(function (accuteAngle) {
              accuteAngle.map(function (accuteLine) {
                if (accuteLine < 5){ // not a diagnal
                  var checkOpposite = true;
                  const oppositeWall = currentVoxel.getOppositeWall(accuteLine);

                  featurePairsAsLines.accute.map(function (accuteAngle2) {
                    if (_.union([oppositeWall],accuteAngle2).length == 2){
                      checkOpposite = false;
                    }
                  });

                  if (checkOpposite){
                    checkWalls.push(oppositeWall);
                  }
                }
              });
            });

            // run through voxel features above for opposite of the checkWall
            var addWalls = [];
            checkWalls.map(function (checkWall) {

              const checkVoxelPosition = currentVoxel.getNeighborPositionOnAxisInDirection(currentDirection,checkWall);
              const checkVoxelPostiionAsString = currentVoxel.coordinatesToString(checkVoxelPosition);
              const checkVoxel = _this.voxels[checkVoxelPostiionAsString];

              if (checkVoxel) {
                const neighborFeatures = checkVoxel.get2dFeaturesInDirection(currentDirection,true);

                if (neighborFeatures[0].length == 4){
                  addWalls.push(checkWall);
                } else{
                  neighborFeatures.map(function (feature) {
                    const featureLine = currentVoxel.getLineValue(feature);
                    if (featureLine == currentVoxel.getOppositeWall(checkWall)){
                      addWalls.push(checkWall);
                    }
                  });
                }
              }
            });

            if (addWalls.length > 0){
              normalizedFeatures.push(currentVoxel.getFeatureWallAsPair(addWalls));

              featurePairs = currentVoxel.getNormalizedPairs(normalizedFeatures);
              featurePairsAsLines = currentVoxel.getFeaturePairsAsLines(featurePairs);
            }

            // RIGHT ANGLE CHECKING
            // check walls and then corner
            featurePairsAsLines.right.forEach(function (rightAngle) {
              var canShear = true;
              if ((_.union(rightAngle,[1,2]).length == 2)|| (_.union(rightAngle,[4,3]).length == 2)){
                normalizedFeatures.map(function (feature) {
                  const lineValue = currentVoxel.getLineValue(feature);
                  if (lineValue == 6){
                    canShear = false;
                  }
                });
              } else if ((_.union(rightAngle,[2,3]).length == 2)|| (_.union(rightAngle,[4,1]).length == 2)){
                normalizedFeatures.map(function (feature) {
                  const lineValue = currentVoxel.getLineValue(feature);
                  if (lineValue == 5){
                    canShear = false;
                  }
                });
              }
              if (canShear){
                // check against walls for solid voxels
                var solidCount = 0;
                rightAngle.forEach(function (wall) {
                  const neighborVoxelPosition = currentVoxel.getNeighborPositionOnAxisInDirection(currentDirection,wall);
                  const neighborPositionString = currentVoxel.coordinatesToString(neighborVoxelPosition);
                  const neightborVoxel = _this.voxels[neighborPositionString];

                  if (neightborVoxel){ // neighbor exists
                    // get neighbor from same direction
                    if (neightborVoxel.isSolid()){ // neighbor is solid
                      solidCount += 1;
                    } else {
                      // if "solid" from this direction

                      //get2dFeaturesInDirection(i) => dict {'directionVertices':[len 4],'featureVertices':[[][]]}
                      const check_normalizedFeatures = neightborVoxel.get2dFeaturesInDirection(currentDirection,true); // true = normalized
                      if (check_normalizedFeatures[0].length == 4){
                        solidCount += 1;
                      } else{
                        // get all feature pairs (lines that join at a vertice)
                        const check_featurePairs = neightborVoxel.getNormalizedPairs(check_normalizedFeatures);
                      }
                    }
                  }
                });

                if (solidCount > 1){ // if both sides are against solid voxel, check corner
                  // both walls are solid, get corner
                  const corner = _.intersection(currentVoxel.lineAsFeature(rightAngle[0]),
                      currentVoxel.lineAsFeature(rightAngle[1]))[0];
                  const cornerNeighborPosition = currentVoxel.getNeighborPositionOnAxisFromCorner(currentDirection,corner);
                  const cornerNeighborPositionAsString = currentVoxel.coordinatesToString(cornerNeighborPosition);
                  const voxelList = _this.checkVoxelsInSquareOpenSpace(currentVoxel,cornerNeighborPositionAsString);

                  voxelList.forEach(function (voxel) {
                    if (voxel){ // if voxel exists
                      _this.badVoxels[voxel] = _this.voxels[voxel];
                    }
                  });
                }
              }

              //todo: check "in front of" and "behind"

            });


            // ACCUTE ANGLES
            featurePairsAsLines.accute.forEach(function (accuteAngle) {
              var canShear = true;

              // get wall directions
              var wallEdge;
              var diagnalEdge;
              accuteAngle.map(function (edge) {
                 if (edge <= 4){
                   wallEdge = edge
                 } else{
                   diagnalEdge = edge
                 }
              });

              // figure out which wall direction to check
              // alg: wallValue * otherWallValue * (even wall = -1; odd wall = 1)
              // ^ that value added to the wallEdge;
              var wallOffset = currentVoxel.wallDirectionToValue(diagnalEdge);

              var wallEvenOffset;
              if (wallEdge % 2 == 0){ // if wall edge is even
                wallEvenOffset = -1;
              } else{
                wallEvenOffset = 1
              }
              wallOffset *= wallEvenOffset;

              var checkWall = wallOffset + wallEdge;
              if (checkWall == 0){checkWall = 4}
              if (checkWall == 5){checkWall = 1}


              normalizedFeatures.map(function (feature) {
                const lineValue = currentVoxel.getLineValue(feature);
                if (lineValue == checkWall){
                  canShear = false;
                }
              });

              if (canShear){
                const neighborVoxelPosition = currentVoxel.getNeighborPositionOnAxisInDirection(currentDirection,checkWall);
                const neighborPositionString = currentVoxel.coordinatesToString(neighborVoxelPosition);
                const neighborVoxel = _this.voxels[neighborPositionString];

                if (neighborVoxel){// if exists
                  const neighborNormalizedFeatures = neighborVoxel.get2dFeaturesInDirection(currentDirection,true);

                  if (neighborNormalizedFeatures[0].length == 4){
                    // neighbor is completely solid
                    _this.badVoxels[neighborPositionString] = _this.voxels[neighborPositionString];
                  } else{
                    // check for neighbor wall
                    const neighborFeaturePairs = currentVoxel.getNormalizedPairs(neighborNormalizedFeatures);
                    // get features as lines, which can work with designed
                    const neighborFeaturePairsAsLines = currentVoxel.getFeaturePairsAsLines(neighborFeaturePairs);
                  }
                }
              }
            });

            // make available checks for each applicable feature-combo
          }
        }
      }
    }
  };

  VoxelGrid.prototype.highlightHinges = function() {
/*

    // run in voxel tools at end of updateVoxelGrid()
    var currentVoxel;
    var testVoxelList;
    var testCornerList;

    var badVoxelList = [];

    for (var voxelCoordinate in this.voxels){
      currentVoxel = this.voxels[voxelCoordinate];
      testVoxelList = [];
      testCornerList = [];

      // reset colors whenever a change is made to the scene
      if (currentVoxel.color != undefined){
        currentVoxel.update(currentVoxel.features, currentVoxel.featureDirection);
      }

      if (!currentVoxel.isSolid()){
        switch (currentVoxel.featureDirection){
          case 0://x
            //CHECK X+1 AND X-1 FOR OTHER DIRECTION

            // move up
            var nextVoxel = this.voxels[(currentVoxel.position.x+1)+","+(currentVoxel.position.y)+","+(currentVoxel.position.z)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x+1)+","+nextVoxel.position.y+","+nextVoxel.position.z];
              } else {
                nextVoxel = false;
              }
            }

            // then move down
            // move up
            var nextVoxel = this.voxels[(currentVoxel.position.x-1)+","+(currentVoxel.position.y)+","+(currentVoxel.position.z)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x-1)+","+nextVoxel.position.y+","+nextVoxel.position.z];
              } else {
                nextVoxel = false;
              }
            }


            testVoxelList.push((currentVoxel.position.x+1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z));
            testVoxelList.push((currentVoxel.position.x-1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z));


            testVoxelList = testVoxelList.concat(this.getCornersToTestFrom(currentVoxel,0));
            break;
          case 1://y

            // move up
            var nextVoxel = this.voxels[(currentVoxel.position.x)+","+(currentVoxel.position.y+1)+","+(currentVoxel.position.z)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x)+","+(nextVoxel.position.y+1)+","+nextVoxel.position.z];
              } else {
                nextVoxel = false;
              }
            }

            // then move down
            nextVoxel = this.voxels[(currentVoxel.position.x)+","+(currentVoxel.position.y-1)+","+(currentVoxel.position.z)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x)+","+(nextVoxel.position.y-1)+","+nextVoxel.position.z];
              } else {
                nextVoxel = false;
              }
            }

            testVoxelList.push((currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z));
            testVoxelList.push((currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z));
            testVoxelList = testVoxelList.concat(this.getCornersToTestFrom(currentVoxel,1));
            break;
          case 2://z

            // move up
            var nextVoxel = this.voxels[(currentVoxel.position.x)+","+(currentVoxel.position.y)+","+(currentVoxel.position.z+1)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x)+","+(nextVoxel.position.y)+","+(nextVoxel.position.z+1)];
              } else {
                nextVoxel = false;
              }
            }

            // then move down
            nextVoxel = this.voxels[(currentVoxel.position.x)+","+(currentVoxel.position.y)+","+(currentVoxel.position.z-1)];
            while (nextVoxel){
              if(testVoxelList.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()){ // make sure voxel is not already a bad voxel
                testVoxelList.push(nextVoxel.positionAsString());
                nextVoxel = this.voxels[(nextVoxel.position.x)+","+(nextVoxel.position.y)+","+(nextVoxel.position.z-1)];
              } else {
                nextVoxel = false;
              }
            }

            testVoxelList.push((currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z + 1));
            testVoxelList.push((currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1));
            testVoxelList = testVoxelList.concat(this.getCornersToTestFrom(currentVoxel,2));
            break;
        }

        // COLOR THE BAD VOXELS
        var len = testVoxelList.length;
        for(var i = 0; i < len; i++){
          try{
            if(this.voxels[testVoxelList[i]].featureDirection != currentVoxel.featureDirection){
              badVoxelList.push(testVoxelList[i]);
            }
          } catch (err){
            // no voxel, which is okay
          }
        }
      }
    }

    for(var i = 0; i < badVoxelList.length; i++){
      // fist color the bad voxels
      var badVoxel = badVoxelList[i];
      const voxel = this.voxels[badVoxel];
      if (voxel.directions == [false,false,false]){
        voxel.setColor(new THREE.Color(1, 0.75, 0.55));
      }
    }

*/
  };

  VoxelGrid.prototype.getVoxelNeighbors = function(voxelCoord){ // returns true if neighbor is solid, else false
    var borders;
    var currentPos = this.voxels[voxelCoord].position;

  };

  VoxelGrid.prototype.getCornersToTestFrom = function(voxel,axis){
    var currentVoxel = voxel;
    var testVoxel;
    var returnList = []; // coordinates not voxel, return the testVoxel
    var walls = {'left':false,'right':false,"up":false,'down':false};

    switch(axis){
      case 0:
        // X= Y= Z+ LOOK RIGHT
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z  + 1);
        try{
          if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
            walls.right = true;
          }
        } catch (err){
          // no voxel, which is okay
        }

        // X= Y+ Z= LOOK UP
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z);
        try{
          if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
            walls.up = true;
          }
        } catch (err){
          // no voxel, which is okay
        }

        // X= Y= Z- LOOK LEFT
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1);
        try{
          if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
            walls.left = true;
          }
        } catch (err){
          // no voxel, which is okay
        }

        // X= Y- Z= LOOK DOWN
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z);
        try{
          if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
            walls.down = true;
          }
        } catch (err){
          // no voxel, which is okay
        }

        // CHECK FOR POSSIBLE BAD CORNERS

        // X= Y+ Z+ UP AND RIGHT
        if (walls.right && walls.up){
          testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z + 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X= Y+ Z- UP AND LEFT
        if (walls.left && walls.up){
          testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z - 1);
          // returnList.push(testVoxel);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X= Y+ Z+ DOWN AND RIGHT
        if (walls.right && walls.down){
          testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z  + 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X= Y+ Z- DOWN AND LEFT
        if (walls.left && walls.down){
          testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z  - 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }
        return returnList;
      case 1:
        // X+ Y= Z= LOOK RIGHT
        testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.right = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X= Y= Z+ LOOK UP
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z + 1);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.up = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X- Y= Z= LOOK LEFT
        testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.left = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X= Y= Z- LOOK DOWN
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.down = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // CHECK FOR POSSIBLE BAD CORNERS

        // X+ Y= Z+ UP AND RIGHT
        if (walls.right && walls.up){
          testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z  + 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X- Y= Z+ UP AND LEFT
        if (walls.left && walls.up){
          testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z + 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X+ Y= Z- DOWN AND RIGHT
        if (walls.right && walls.down){
          testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X- Y= Z- DOWN AND LEFT
        if (walls.left && walls.down){
          testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        return returnList;
      case 2:
        // X+ Y= Z= LOOK RIGHT
        testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.right = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X= Y+ Z= LOOK UP
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.up = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X- Y= Z= LOOK LEFT
        testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.left = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // X= Y- Z= LOOK DOWN
        testVoxel = (currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z);
        try{
            if(this.voxels[testVoxel].featureDirection != currentVoxel.featureDirection){
              walls.down = true;
            }
          } catch (err){
            // no voxel, which is okay
          }

        // CHECK FOR POSSIBLE BAD CORNERS

        // X+ Y+ Z= UP AND RIGHT
        if (walls.right && walls.up){
          testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X- Y+ Z= UP AND LEFT
        if (walls.left && walls.up){
          testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X+ Y- Z= DOWN AND RIGHT
        if (walls.right && walls.down){
          testVoxel = (currentVoxel.position.x + 1) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }

        // X- Y- Z= DOWN AND LEFT
        if (walls.left && walls.down){
          testVoxel = (currentVoxel.position.x - 1) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z);
          returnList = returnList.concat(this.checkVoxelsInSquareOpenSpace(currentVoxel, testVoxel));
        }
        return returnList;
    }
  };

  VoxelGrid.prototype.checkVoxelsInSquareOpenSpace = function(voxel,checkPosition) {
    var xyz = checkPosition.split(',');
    var openX = parseFloat(xyz[0]);
    var openY = parseFloat(xyz[1]);
    var openZ = parseFloat(xyz[2]);

    var limX = voxel.position.x;
    var limY = voxel.position.y;
    var limZ = voxel.position.z;
    var limVoxel;

    var xCorner = openX;
    var yCorner = openY;
    var zCorner = openZ;


    function setLimits (){
      limX = voxel.position.x;
      limY = voxel.position.y;
      limZ = voxel.position.z;
    }

    function checkAlong(self, axis, diff){
      setLimits();

      var keepGoing = true;
      while (keepGoing) {
        limVoxel = limX + "," + limY + "," + limZ;
        if ((self.voxels[limVoxel]) == undefined) {
          if (axis == 'x'){
            limX-= diff;
          } else if (axis == 'y'){
            limY-= diff;
          } else if (axis == 'z'){
            limZ-= diff;
          }
          keepGoing = false;
          if (axis == 'x'){
            return limX;
          } else if (axis == 'y'){
            return limY;
          } else if (axis == 'z'){
            return limZ;
          }
        } else{
          if (axis == 'x'){
            limX+= diff;
          } else if (axis == 'y'){
            limY+= diff;
          } else if (axis == 'z'){
            limZ+= diff;
          }
        }
      }
    }

    var returnList = [];

    if (openX == voxel.position.x) {
      yCorner = checkAlong(this, 'y', (openY - limY));
      zCorner = checkAlong(this, 'z', (openZ - limZ));

      setLimits();
      var returnCoordinates;
      var changeI = (openY - limY);
      var changeJ = (openZ - limZ);

      for (var i = openY; i != (yCorner + changeI); i += changeI){
        for (var j = openZ; j != (zCorner + changeJ); j += changeJ){
          returnCoordinates = (xCorner) + "," + (i) + "," + (j);
          if (this.voxels[returnCoordinates] != undefined) {
            returnList.push(returnCoordinates);
          }
        }
      }
    } else if (openY == voxel.position.y) {
      xCorner = checkAlong(this, 'x', (openX - limX));
      zCorner = checkAlong(this, 'z', (openZ - limZ));

      setLimits();
      var returnCoordinates;
      var changeI = (openX - limX);
      var changeJ = (openZ - limZ);

      for (var i = openX; i != (xCorner + changeI); i += changeI){
        for (var j = openZ; j != (zCorner + changeJ); j += changeJ){
          returnCoordinates = (i) + "," + (yCorner) + "," + (j);
          if (this.voxels[returnCoordinates] != undefined) {
            returnList.push(returnCoordinates);
          }
        }
      }
    } else if (openZ == voxel.position.z) {
      xCorner = checkAlong(this, 'x', (openX - limX));
      yCorner = checkAlong(this, 'y', (openY - limY));

      setLimits();
      var returnCoordinates;
      var changeI = (openX - limX);
      var changeJ = (openY - limY);

      for (var i = openX; i != (xCorner + changeI); i += changeI){
        for (var j = openY; j != (yCorner + changeJ); j += changeJ){
          returnCoordinates = (i) + "," + (j) + "," + (zCorner);
          if (this.voxels[returnCoordinates] != undefined) {
            returnList.push(returnCoordinates);
          }
        }
      }
    }

    function stringToCoordinates(stringOfCoordinates) {
      var returnArray = stringOfCoordinates.split(",");
      var returnDict = {'x':parseFloat(returnArray[0]), 'y':parseFloat(returnArray[1]), 'z':parseFloat(returnArray[2])}
      return returnDict;
    }
    function coordinatesToString(x,y,z) {
      return x+","+y+","+z;
    }

    function dictToCoordinates(a) {
      return a.x+","+a.y+","+a.z;
    }

    function connectsTo(voxelCooridantes, listOfAvailableVoxels, listOfTargetVoxels) { // any voxel along the axis
      if (listOfTargetVoxels.indexOf(voxelCooridantes) > -1){
        return true;
      } else if (listOfAvailableVoxels.indexOf(voxelCooridantes) > -1){
        // test again without current voxel in list
        // this prevents from inifinite loop, where the recursive function keeps going back and forth between touching cells
        var newListOfAvailable = listOfAvailableVoxels.filter(function(i){return i != voxelCooridantes});
        var voxelDict = stringToCoordinates(voxelCooridantes);
        // check if x,y,z are changed by one
        if(connectsTo(coordinatesToString(voxelDict.x+1,voxelDict.y,voxelDict.z),newListOfAvailable,listOfTargetVoxels)){
          return true;
        } else if(connectsTo(coordinatesToString(voxelDict.x-1,voxelDict.y,voxelDict.z),newListOfAvailable,listOfTargetVoxels)) {
          return true;
        } else if(connectsTo(coordinatesToString(voxelDict.x,voxelDict.y+1,voxelDict.z),newListOfAvailable,listOfTargetVoxels)){
          return true;
        } else if(connectsTo(coordinatesToString(voxelDict.x,voxelDict.y-1,voxelDict.z),newListOfAvailable,listOfTargetVoxels)){
          return true;
        }  else if(connectsTo(coordinatesToString(voxelDict.x,voxelDict.y,voxelDict.z+1),newListOfAvailable,listOfTargetVoxels)){
          return true;
        } else if(connectsTo(coordinatesToString(voxelDict.x,voxelDict.y,voxelDict.z-1),newListOfAvailable,listOfTargetVoxels)) {
          return true;
        }
      }
      return false;
    }

    var sum = function (x,y) {
      return x + y;
    };
    var sub = function (x,y) {
      return x - y;
    };

    // get the list of voxels that can be reached to form a bridge
    var countXUp = sum;
    if (limX < xCorner){countXUp = sub}

    var countYUp = sum;
    if (limY < yCorner){countYUp = sub}

    var countZUp = sum;
    if (limZ < zCorner){countZUp = sub}

    // this needs to be fixed
    // direction and axis affect whether values should be higher or lower
    var xRow = [];
    for (var i = xCorner; i != limX; i = countXUp(i,1)){
      xRow.push(coordinatesToString(i,openY,countXUp(openZ,1)));
    }

    var yRow = [];
    for (var i = yCorner; i != limY; i = countYUp(i,1)){
      yRow.push(coordinatesToString(openX,i,countXUp(openZ,1)));
    }

    var zRow = [];
    for (var i = zCorner; i != limZ; i = countZUp(i,1)){
      zRow.push(coordinatesToString(countXUp(openX,1),openY,i));
    }


    function getClusters(coordList) {
      if (coordList == undefined){coordList = [];}
      // for (var i = 0; i < coordList.length; i++){
      //   coordList[i] = stringToCoordinates(coordList[i])
      // }
      // coordList.map(stringToCoordinates); <=== NOT WORKING FOR SOME REASON
      var clusters = [];
      while (coordList.length >= 1){
        // console.log("new clusters outn of ",coordList);
        // console.log('cordList',coordList);
        cluster = [];
        //cluster = ;
        floodFill(coordList[0],coordList);
        // console.log("cluster:",cluster);
        coordList = coordList.diff(cluster);
        // console.log('cordList',coordList);
        clusters = clusters.concat([cluster]);
        // console.log('clusterS:',clusters);
      }
      return clusters;
    }

    function floodFill(node, coordArray){
      if (coordArray.indexOf(node) == -1 || cluster.indexOf(node) > -1){ // node is not in the coord array, or already found
        // console.log('node not available, or in cluster');
      } else{
        cluster = cluster.concat(node);
        var newCoordArray = coordArray.filter(function(i){return i != node});
        var nodeAsDict = stringToCoordinates(node);

        var sampleArray = [{"x":nodeAsDict.x+1,"y":nodeAsDict.y,"z":nodeAsDict.z},
          {"x":nodeAsDict.x-1,"y":nodeAsDict.y,"z":nodeAsDict.z},
          {"x":nodeAsDict.x,"y":nodeAsDict.y+1,"z":nodeAsDict.z},
          {"x":nodeAsDict.x,"y":nodeAsDict.y-1,"z":nodeAsDict.z},
          {"x":nodeAsDict.x,"y":nodeAsDict.y,"z":nodeAsDict.z-1},
          {"x":nodeAsDict.x,"y":nodeAsDict.y,"z":nodeAsDict.z+1}];

        if (newCoordArray.length>0){
          for (var i = 0; i < sampleArray.length; i++){
            // console.log('sampling',sampleArray[i]);
            if (cluster.indexOf(sampleArray[i]) == -1) { // make sure this hasn't already been tested
              floodFill(dictToCoordinates(sampleArray[i]),newCoordArray);
            }
          }
        }
      }
    }

    function isBorder (voxel1, voxel2) {
      var v1 = stringToCoordinates(voxel1);
      var v2 = stringToCoordinates(voxel2);

      var a = abs(v1.x - v2.x);
      var b = abs(v1.y - v2.y);
      var c = abs(v1.z - v2.z);
      var dist = sqrt((a*a)+(b*b)+(c*c));

      return (dist == 1);
    }

    function clusterTouches(clusterArray, touchingArray){
      for (var i = 0; i < clusterArray.length; i++){
        for (var j = 0; j < touchingArray.length; j++) {
          if (isBorder(clusterArray[i],touchingArray[j])){
            return true;
          }
        }
      }
      return false;
      //return (connectsTo(clusterArray[0],clusterArray,touchingArray));
    }

    // sudo code:

    // var clusters = getClusters(returnList)
    // for cluster in clusters:
    //   touchesX = connectsTo(cluster, xRow)
    //   touchesY = connectsTo(cluster, yRow)
    //   touchesZ = connectsTo(cluster, zRow)
    // if (touchesX + touchesY + touchesZ > 1):
    //   for voxel in cluster:
    //     returnListTrimmed.push(voxel)

    // console.log("return list",returnList.length,returnList);
    var cluster = []
    var clustersList = getClusters(returnList);


    // var finalReturnList = [];
    // if (clustersList[0].length > 0){
    //   clustersList[0].map(function (cluster) {
    //     finalReturnList.push(cluster);
    //   });
    // }
    //
    // console.log(finalReturnList);
    // return finalReturnList;



    var returnListTrimmed = [];


    for (i = 0; i<clustersList.length;i++){
      var cluster = clustersList[i];
      var connectsX = clusterTouches(cluster,xRow);
      var connectsY = clusterTouches(cluster,yRow);
      var connectsZ = clusterTouches(cluster,zRow);

      if ((connectsX + connectsY + connectsZ) > 1){
        returnListTrimmed = returnListTrimmed.concat(cluster);
      }
    }

    // based on featureDirection, extrapolate the bad-voxels "upwards" and "downwards"
    var addToTrimmed = [];
    var currentVoxel;
    var nextVoxel;

    switch (voxel.featureDirection) {
      case 0://x
        //CHECK X+1 AND X-1 FOR OTHER DIRECTION

        // move up
        for (var i = 0; i < returnListTrimmed.length; i++) {
          currentVoxel = this.voxels[returnListTrimmed[i]];
          nextVoxel = this.voxels[(currentVoxel.position.x + 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z)];

          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x + 1) + "," + nextVoxel.position.y + "," + nextVoxel.position.z];
            } else {
              nextVoxel = false;
            }
          }
          // then move down
          nextVoxel = this.voxels[(currentVoxel.position.x - 1) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z)];
          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x - 1) + "," + nextVoxel.position.y + "," + nextVoxel.position.z];
            } else {
              nextVoxel = false;
            }
          }
        }
        break;
      case 1://y
        //CHECK X+1 AND X-1 FOR OTHER DIRECTION
        // move up
        for (var i = 0; i < returnListTrimmed.length; i++) {
          currentVoxel = this.voxels[returnListTrimmed[i]];
          nextVoxel = this.voxels[(currentVoxel.position.x) + "," + (currentVoxel.position.y + 1) + "," + (currentVoxel.position.z)];

          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x) + "," + (nextVoxel.position.y + 1) + "," + (nextVoxel.position.z)];
            } else {
              nextVoxel = false;
            }
          }
          // then move down
          nextVoxel = this.voxels[(currentVoxel.position.x) + "," + (currentVoxel.position.y - 1) + "," + (currentVoxel.position.z)];
          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x) + "," + (nextVoxel.position.y - 1) + "," + (nextVoxel.position.z)];
            } else {
              nextVoxel = false;
            }
          }
        }

        break;
      case 2://z
        // move up
        for (var i = 0; i < returnListTrimmed.length; i++) {
          currentVoxel = this.voxels[returnListTrimmed[i]];
          nextVoxel = this.voxels[(currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z + 1)];

          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x) + "," + (nextVoxel.position.y) + "," + (nextVoxel.position.z + 1)];
            } else {
              nextVoxel = false;
            }
          }
          // then move down
          nextVoxel = this.voxels[(currentVoxel.position.x) + "," + (currentVoxel.position.y) + "," + (currentVoxel.position.z - 1)];
          while (nextVoxel) {
            if (returnListTrimmed.indexOf(nextVoxel.positionAsString()) == -1 && nextVoxel.isSolid()) { // make sure voxel is not already a bad voxel
              addToTrimmed.push(nextVoxel.positionAsString());
              nextVoxel = this.voxels[(nextVoxel.position.x) + "," + (nextVoxel.position.y) + "," + (nextVoxel.position.z - 1)];
            } else {
              nextVoxel = false;
            }
          }
        }
        break;
    }

    returnListTrimmed = returnListTrimmed.concat(addToTrimmed);
    return returnListTrimmed;
  };

  VoxelGrid.prototype.isBorder = function (voxel1, voxel2) {
    var v1 = stringToCoordinates(voxel1);
    var v2 = stringToCoordinates(voxel2);

    var a = abs(v1.x - v2.x);
    var b = abs(v1.y - v2.y);
    var c = abs(v1.z - v2.z);
    var dist = sqrt((a*a)+(b*b)+(c*c));

    return (dist == 1);
  };

  return VoxelGrid;

})();

Array.prototype.diff = function(a) {
  return this.filter(function(i) {return a.indexOf(i) < 0;});
};
