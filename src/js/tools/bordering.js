'use strict';

const THREE        = require('three');

const borderThickness = 0.4;
const boxConstantAlmostOne = 0.999;

const material = new THREE.MeshPhongMaterial( { color: 0x888888, shading: THREE.SmoothShading } );
let borderinObjectsInScene = [];
let mapPositionToBorderingObject = new Map();

function Neighbors( position, featureDirection ){
  this.top = {};
  this.bottom = {};
  this.left = {};
  this.right = {};

  this.top.position = position.clone();
  this.bottom.position = position.clone();
  this.left.position = position.clone();
  this.right.position = position.clone();

  this.top.borderOffset = new THREE.Vector3( 0, 0, (1 - borderThickness) / 2 );
  this.bottom.borderOffset = new THREE.Vector3( 0, 0, - (1 - borderThickness) / 2 );
  this.left.borderOffset = new THREE.Vector3( (1 - borderThickness) / 2, 0, 0 );
  this.right.borderOffset = new THREE.Vector3( - (1 - borderThickness) / 2, 0, 0 );

  this.top.goOne = function() {
    if( featureDirection == 1 ){
      this.position.z--;
    }
  }

  this.bottom.goOne = function() {
    if( featureDirection == 1 ) {
      this.position.z++;
    }          
  }

  this.left.goOne = function() {
    if( featureDirection == 1 ){
      this.position.x--;
    }
  }

  this.right.goOne = function() {
    if( featureDirection == 1 ) {
      this.position.x++;
    }          
  }

  this.top.goOne();
  this.bottom.goOne();
  this.left.goOne();
  this.right.goOne();
};

module.exports = function( thisArg ) {
  const voxels = thisArg.voxelGrid.voxels;

  // erase borders
  if( borderinObjectsInScene.length > 0 ) {
    for( let i = borderinObjectsInScene.length - 1; i >= 0; i-- ) {
        thisArg.renderer.scene.remove( borderinObjectsInScene[ i ] );
      }
    borderinObjectsInScene = [];
  }
  mapPositionToBorderingObject.clear();

  // first, we have to iterate over all voxels to build up mapPositionToBorderingObject meanwhile.
  // then, we can check later 'closed corners' to remove objects which are opposite.
  let checkLaterForRemoval = [];
  for( let voxelCoordinate in voxels ) {
    let currentVoxel = voxels[ voxelCoordinate ];

    // only sheerable ones
    const sheerableFeatures = [ "bottom-edge", "left-edge", "right-edge", "top-edge" ];
    if( currentVoxel.features.toString() == sheerableFeatures.toString() ) {
      let neighbors = new Neighbors( currentVoxel.position, currentVoxel.featureDirection );

      let borderingObjectsToAdd = [];

      function checkNeighboringCells( direction ) {
        const position = neighbors[ direction ].position;
        if( thisArg.voxelGrid.isFreeAtPosition( position ) ) {
          const key = position.toArray().toString();
          let geometry;
          if ( neighbors[ direction ].borderOffset.x == 0 ) {
            geometry = new THREE.BoxGeometry( boxConstantAlmostOne, boxConstantAlmostOne, borderThickness );
          } else {
            geometry = new THREE.BoxGeometry( borderThickness, boxConstantAlmostOne, boxConstantAlmostOne ); 
          }
          var box = new THREE.Mesh( geometry, material );
          let newPos = position.clone().add( neighbors[ direction ].borderOffset );
          box.position.set( newPos.x, newPos.y, newPos.z );
          box.userData = direction;
          borderingObjectsToAdd.push( box );

          if( mapPositionToBorderingObject.has( key ) ) {
            // we have a found a 'closed' corner. remove the existing bordering + remove later the opposite borders.
            const other = mapPositionToBorderingObject.get( key );
            mapPositionToBorderingObject.set( key, [other, box]);
            checkLaterForRemoval.push( {position: position, featureDirection: currentVoxel.featureDirection} );
          
          } else {
            mapPositionToBorderingObject.set( key, box );
          }

        }
      };

      [ 'top', 'bottom', 'left', 'right' ].forEach( checkNeighboringCells );

      for( let i = 0; i < borderingObjectsToAdd.length; i++ ){
        const obj = borderingObjectsToAdd[ i ];

        // only do it if there were two borderings werde added based on one 'seed' voxel
        if(borderingObjectsToAdd.length == 2) {

          // to verify the dimension of the border, it checks the borderThickness. This is a hack. So make sure, that the border thickness is unique.
          function cutCorner(direction1, direction2, boxId1, boxId2){
            let first = borderingObjectsToAdd[0];
            let second = borderingObjectsToAdd[1];
            if(( first.userData == direction1 && second.userData == direction2 ) || (first.userData == direction2 && second.userData == direction1 )) {

              if( borderThickness / 2 == Math.abs(obj.geometry.vertices[boxId1].z)) {
                obj.geometry.vertices[boxId1].z = 0;
                obj.geometry.vertices[boxId2].z = 0;
              }

              if( borderThickness / 2 == Math.abs(obj.geometry.vertices[boxId1].x)) {
                obj.geometry.vertices[boxId1].x = 0;
                obj.geometry.vertices[boxId2].x = 0;
              }             
            }
          }
          cutCorner('bottom', 'left', 5, 7);
          cutCorner('bottom', 'right', 0, 2);
          cutCorner('top', 'left', 4, 6);
          cutCorner('top', 'right', 1, 3);

        }
        thisArg.renderer.scene.add( obj );
        borderinObjectsInScene.push( obj );
      }
    }
  }

  checkLaterForRemoval.forEach( cutBorderAppropiately );

  // detect borders (x) which are opposite of an inner corner
  // also detect the border elements adjacent to x ro cut them to form a triangle
  function cutBorderAppropiately( positionAndFeatureDireciton ) {
    let position = positionAndFeatureDireciton.position;
    let featureDirection = positionAndFeatureDireciton.featureDirection;
    const k = position.toArray().toString();
    const bothBorderElements =  mapPositionToBorderingObject.get( k );
    const bothDirections = [bothBorderElements[0].userData, bothBorderElements[1].userData]

    for(let i = 0; i < bothBorderElements.length; i++){
        const objBox = bothBorderElements[i];
        const gap = -0.3;
        const remainingThickness = borderThickness * 0.1;

        switch(objBox.userData) {
          case 'top':
            if(bothDirections.indexOf('left') != -1)
              moveVertices(objBox, -gap, remainingThickness, 0, 2, 1, 3, 'x', 'z');
            else
              moveVertices(objBox, gap, remainingThickness, 5, 7, 4, 6, 'x', 'z');
            break;
          case 'bottom':
            if(bothDirections.indexOf('left') != -1)
              moveVertices(objBox, -gap, -remainingThickness, 1, 3, 0, 2, 'x', 'z');
            else
              moveVertices(objBox, gap, -remainingThickness, 4, 6, 5, 7, 'x', 'z');
            break;
          case 'left':
            if(bothDirections.indexOf('top') != -1)
              moveVertices(objBox, -gap, remainingThickness, 0, 2, 5, 7, 'z', 'x');
            else
              moveVertices(objBox, gap, remainingThickness, 1, 3, 4, 6, 'z', 'x');
            break;
          case 'right':
            if(bothDirections.indexOf('top') != -1)
              moveVertices(objBox, -gap, -remainingThickness, 5, 7, 0, 2, 'z', 'x');
            else
              moveVertices(objBox, gap, -remainingThickness, 4, 6, 1, 3, 'z', 'x');
            break;
        }
    }


    function moveVertices(boxObject, gap, remainingThickness, id1, id2, id3, id4, dimension1, dimension2) {
      let vertices = boxObject.geometry.vertices;
      vertices[id1][dimension1] = gap;
      vertices[id2][dimension1] = gap;
      vertices[id3][dimension1] = gap;
      vertices[id4][dimension1] = gap;
      vertices[id3][dimension2] = remainingThickness;
      vertices[id4][dimension2] = remainingThickness;
      boxObject.geometry.vertices = vertices;
    }

    function cutOppositeBorder( direction ) {
      let neighborsCorner = new Neighbors( position, featureDirection );  
      let i = 0;
      while( !thisArg.voxelGrid.isFreeAtPosition( neighborsCorner[ direction ].position ) ){
        neighborsCorner[ direction ].goOne();
        i++;
      }
      if( i > 0) {
        const k = neighborsCorner[ direction ].position.toArray().toString();
        let objBoxNeighbors = new Neighbors(neighborsCorner[ direction ].position, featureDirection);
        const objBox = mapPositionToBorderingObject.get( k );

        const gap = -0.4;
        const remainingThickness = borderThickness * 0.1;
        // remove the opposite border element depending on the directions of the inner corner
        // therefore it also important to 
        switch(objBox.userData) {
          case 'top':
            if(bothDirections.indexOf('left') != -1) {
              moveVertices(objBox, -gap, remainingThickness, 0, 2, 1, 3, 'x', 'z');
              const k = objBoxNeighbors.right.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, gap, remainingThickness, 5, 7, 4, 6, 'x', 'z');
            }
            else {
              moveVertices(objBox, gap, remainingThickness, 5, 7, 4, 6, 'x', 'z');
              const k = objBoxNeighbors.left.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, -gap, remainingThickness, 0, 2, 1, 3, 'x', 'z');
            }
            break;
          case 'bottom':
            if(bothDirections.indexOf('left') != -1) {
              moveVertices(objBox, -gap, -remainingThickness, 1, 3, 0, 2, 'x', 'z');
              const k = objBoxNeighbors.right.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, gap, -remainingThickness, 4, 6, 5, 7, 'x', 'z');
            }
            else {
              moveVertices(objBox, gap, -remainingThickness, 4, 6, 5, 7, 'x', 'z');
              const k = objBoxNeighbors.left.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, -gap, -remainingThickness, 1, 3, 0, 2, 'x', 'z');
            }
            break;
          case 'left':
            if(bothDirections.indexOf('top') != -1) {
              moveVertices(objBox, -gap, remainingThickness, 0, 2, 5, 7, 'z', 'x');
              const k = objBoxNeighbors.bottom.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );   
              moveVertices(otherObjBox, gap, remainingThickness, 1, 3, 4, 6, 'z', 'x');
            }
            else {
              moveVertices(objBox, gap, remainingThickness, 1, 3, 4, 6, 'z', 'x');
              const k = objBoxNeighbors.top.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );   
              moveVertices(otherObjBox, -gap, remainingThickness, 0, 2, 5, 7, 'z', 'x');
            }
            break;
          case 'right':
            if(bothDirections.indexOf('top') != -1) {
              moveVertices(objBox, -gap, -remainingThickness, 5, 7, 0, 2, 'z', 'x');
              const k = objBoxNeighbors.bottom.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, gap, -remainingThickness, 4, 6, 1, 3, 'z', 'x');
            }
            else{
              moveVertices(objBox, gap, -remainingThickness, 4, 6, 1, 3, 'z', 'x');
              const k = objBoxNeighbors.top.position.toArray().toString();
              let otherObjBox = mapPositionToBorderingObject.get( k );
              moveVertices(otherObjBox, -gap, -remainingThickness, 5, 7, 0, 2, 'z', 'x');
            }
            break;
        }
      }
    };

    [ 'top', 'bottom', 'left', 'right' ].forEach( cutOppositeBorder );

  };
};
