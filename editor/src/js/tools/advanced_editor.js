'use strict';

const $     = require('jquery');
const _     = require('lodash');
const THREE = require('three');

const bind  = require('../misc/bind');

module.exports = (function() {

  function AdvancedEditor(tools) {
    bind(this);

    this.tools = tools;

    this.canvas = $('#voxel-advanced-canvas')[0];
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvasPosition = new THREE.Vector2(-540, -540);

    this.renderCanvas = document.createElement("canvas");

    this.context = this.canvas.getContext('2d');
    this.context.strokeStyle = '#00adee';
    this.context.lineWidth = 3;

    $('#voxel-advanced-rotate-btn')[0].addEventListener('click', this.rotateRight);

    this.brushContainers = [0, 1, 2, 3].map(function(height) {
      return $('#voxel-cells-container-' + height);
    });

    this.brushes = {};
    this.cellSize = 57;
    this.imageSize = 72;

    this.grid = new Image();
    this.grid.src = './img/advanced_grid.png';

    const featurePromises = [];
    this.features = _.forEach({
      'box': {
        src: './img/advanced_box.png',
        rotated: 'box',
        mirrored: [ 'box', 'box' ]
      },
      'top-edge': {
        src: './img/advanced_edge_top.png',
        rotated: 'right-edge',
        mirrored: [ 'bottom-edge', 'top-edge' ]
      },
      'bottom-edge': {
        src: './img/advanced_edge_bottom.png',
        rotated: 'left-edge',
        mirrored: [ 'top-edge', 'bottom-edge' ]
      },
      'left-edge': {
        src: './img/advanced_edge_left.png',
        rotated: 'top-edge',
        mirrored: [ 'left-edge', 'right-edge' ]
      },
      'right-edge': {
        src: './img/advanced_edge_right.png',
        rotated: 'bottom-edge',
        mirrored: [ 'right-edge', 'left-edge' ]
      },
      'pos-diagonal': {
        src: './img/advanced_diagonal_pos.png',
        rotated: 'neg-diagonal',
        mirrored: [ 'neg-diagonal', 'neg-diagonal' ]
      },
      'neg-diagonal': {
        src: './img/advanced_diagonal_neg.png',
        rotated: 'pos-diagonal',
        mirrored: [ 'pos-diagonal', 'pos-diagonal' ]
      },
      'top-left-triangle': {
        src: './img/advanced_triangle_top_left.png',
        rotated: 'top-right-triangle',
        mirrored: [ 'top-right-triangle', 'bottom-left-triangle' ]
      },
      'top-right-triangle': {
        src: './img/advanced_triangle_top_right.png',
        rotated: 'bottom-right-triangle',
        mirrored: [ 'top-left-triangle', 'bottom-right-triangle' ]
      },
      'bottom-left-triangle': {
        src: './img/advanced_triangle_bottom_left.png',
        rotated: 'top-left-triangle',
        mirrored: [ 'bottom-right-triangle', 'top-left-triangle' ]
      },
      'bottom-right-triangle': {
        src: './img/advanced_triangle_bottom_right.png',
        rotated: 'bottom-left-triangle',
        mirrored: [ 'bottom-left-triangle', 'top-right-triangle' ]
      },
      'top-left-corner': {
        src: './img/advanced_corner_top_left.png',
      },
      'top-right-corner': {
        src: './img/advanced_corner_top_right.png',
      },
      'bottom-left-corner': {
        src: './img/advanced_corner_bottom_left.png',
      },
      'bottom-right-corner': {
        src: './img/advanced_corner_bottom_right.png',
      }
    }, function(feature) {
      const deferred = $.Deferred();
      feature.image = new Image();
      feature.image.onload = function() {
        deferred.resolve();
      }
      feature.image.src = feature.src;
      featurePromises.push(deferred.promise());
    });

    $.when.apply(null, featurePromises).then(function() {
      [
        {
          cells: {
            '0,0': {
              coords: [0, 0],
              features: [ 'box' ]
            }
          }
        },
        {
          cells: {
            '0,0': {
              coords: [0, 0],
              features: [ 'top-edge', 'bottom-edge', 'left-edge', 'right-edge' ]
            }
          }
        },
        {
          cells: {
            '0,0': {
              coords: [0, 0],
              features: [ 'neg-diagonal' ]
            },
            '0,1': {
              coords: [0, 1],
              features: [ 'pos-diagonal' ]
            },
            '1,0': {
              coords: [1, 0],
              features: [ 'pos-diagonal' ]
            },
            '1,1': {
              coords: [1, 1],
              features: [ 'neg-diagonal' ]
            }
          },
          rotated: true
        }
      ].map(this.addBrush);

      _.values(this.brushes).forEach(function(brush) {
        brush.used = true;
      });

      this.activateBrush(this.brushes['1__1__0_0_box'], true);
    }.bind(this));
  }

  AdvancedEditor.prototype.selectBrush = function(evt) {
    this.activateBrush(this.brushes[evt.currentTarget.id], true);
  }

  AdvancedEditor.prototype.removeUnusedBrush = function() {
    if (this.activeBrush && !this.activeBrush.used) {
      this.activeBrush.domElement.remove();
      delete this.brushes[this.activeBrush.hash];
    }
  }

  AdvancedEditor.prototype.activateBrush = function(brush, center) {
    this.removeUnusedBrush();

    $('.voxel-cells-btn').removeClass('active');

    this.activeBrush = brush;
    brush.domElement.addClass('active');
    
    this.tools.forEach(function(tool) {
      tool.activeBrush = brush;
      tool.rotatedMode = brush.rotated;
    });

    this.update();

    if (center) {
      this.canvasPosition.fromArray([
        -308 - (brush.bounds.left + brush.width / 2.0) * this.cellSize,
        -392 - (brush.bounds.top + brush.height / 2.0) * this.cellSize
      ]);
      $(this.canvas).css('left', this.canvasPosition.x);
      $(this.canvas).css('top', this.canvasPosition.y);
    }
  }

  AdvancedEditor.prototype.update = function(brush, noBorder, noGrid) {
    brush = brush || this.activeBrush;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!noGrid) {
      for (var x = 0; x < 1000; x += this.cellSize)
        for (var y = 0; y < 1000; y += this.cellSize) {
          this.context.drawImage(this.grid, x, y, this.imageSize, this.imageSize);
      }
    }

    _.values(brush.cells).forEach(function(cell) {
      const x = 456 + this.cellSize * cell.coords[0];
      const y = 456 + this.cellSize * cell.coords[1];

      cell.features.forEach(function(feature) {
        this.context.drawImage(this.features[feature].image, x, y, this.imageSize, this.imageSize);
      }.bind(this));

      if (~cell.features.indexOf('top-edge') && ~cell.features.indexOf('left-edge')) {
        this.context.drawImage(this.features['top-left-corner'].image, x, y, this.imageSize, this.imageSize);
      }
      if (~cell.features.indexOf('top-edge') && ~cell.features.indexOf('right-edge')) {
        this.context.drawImage(this.features['top-right-corner'].image, x, y, this.imageSize, this.imageSize);
      }
      if (~cell.features.indexOf('bottom-edge') && ~cell.features.indexOf('left-edge')) {
        this.context.drawImage(this.features['bottom-left-corner'].image, x, y, this.imageSize, this.imageSize);
      }
      if (~cell.features.indexOf('bottom-edge') && ~cell.features.indexOf('right-edge')) {
        this.context.drawImage(this.features['bottom-right-corner'].image, x, y, this.imageSize, this.imageSize);
      }
    }.bind(this));

    if (!noBorder) {
      this.context.strokeRect(
        456 + brush.bounds.left * this.imageSize,
        456 + brush.bounds.top * this.imageSize,
        brush.width * this.cellSize + this.imageSize - this.cellSize,
        brush.height * this.cellSize + this.imageSize - this.cellSize
      );
    }
  }

  AdvancedEditor.prototype.mirrorFeatures = function(features, axis) {
    return features.map(function(feature) {
      return this.features[feature].mirrored[axis];
    }.bind(this));
  }

  AdvancedEditor.prototype.addBrush = function(brush) {
    brush.hash = this.generateBrushHash(brush);
    brush.icon = this.createBrushIcon(brush);
    brush.textureIcon = this.createBrushIcon(brush, true);

    if (!this.brushes[brush.hash]) {
      brush.domElement = $('<div></div>')
        .attr({ id: brush.hash })
        .addClass('voxel-btn voxel-cells-btn')
        .append($('<div></div>')
          .addClass('voxel-btn-img')
          .css({ width: brush.width * 24 + 26 })
          .append($('<div></div>')
            .addClass('voxel-btn-selection')
          )
          .append(brush.icon)
        );
      brush.domElement.click(this.selectBrush);
    }

    _.mapValues(brush.cells, function(cell) {
      cell.mirroredFeatures = {
        'false,false,false': cell.features.slice(),
        'true,false,false': this.mirrorFeatures(cell.features, 0),
        'false,false,true': this.mirrorFeatures(cell.features, 1),
        'true,false,true': this.mirrorFeatures(this.mirrorFeatures(cell.features, 0), 1)
      };
    }.bind(this));

    this.brushes[brush.hash] = brush;
    this.brushContainers[brush.height].append(brush.domElement);
  }

  AdvancedEditor.prototype.transformedFeatures = function(features, transformation) {
    return features.map(function(feature) {
      return this.features[feature][transformation];
    }.bind(this));
  }

  AdvancedEditor.prototype.updateBrushBounds = function(brush) {
    brush.bounds = _.values(brush.cells).reduce(function(prev, cell) {
      return {
        left: Math.min(prev.left, cell.coords[0]),
        top: Math.min(prev.top, cell.coords[1]),
        right: Math.max(prev.right, cell.coords[0] + 1),
        bottom: Math.max(prev.bottom, cell.coords[1] + 1),
      }
    }, { top: 10, left: 10, bottom: -10, right: -10 });

    brush.width = brush.bounds.right - brush.bounds.left;
    brush.height = brush.bounds.bottom - brush.bounds.top;
  }

  AdvancedEditor.prototype.generateBrushHash = function(brush) {
    if (!brush.bounds || !brush.width || !brush.height) {
      this.updateBrushBounds(brush);
    }

    return [brush.width, brush.height].concat(_.values(brush.cells).map(function(cell) {
      return cell.coords.concat(cell.features.sort()).join('_');
    })).join('__');
  }

  AdvancedEditor.prototype.createBrushIcon = function(brush, grid) {
    const image = new Image();
    this.update(brush, true, grid);
    const imageData = this.context.getImageData(
      456 + brush.bounds.left * this.cellSize,
      456 + brush.bounds.top * this.cellSize,
      brush.width * this.cellSize + this.imageSize - this.cellSize,
      brush.height * this.cellSize + this.imageSize - this.cellSize
    );
    
    this.renderCanvas.width = brush.width * this.cellSize + this.imageSize - this.cellSize;
    this.renderCanvas.height = brush.height * this.cellSize + this.imageSize - this.cellSize;
    this.renderCanvas.getContext('2d').putImageData(imageData, 0, 0);

    image.src = this.renderCanvas.toDataURL("image/png");
    return image;
  }

  AdvancedEditor.prototype.rotateRight = function() {
    const rotatedBrush = {
      cells: _.mapValues(this.activeBrush.cells, function(cell) {
        return {
          coords: [-cell.coords[1], cell.coords[0]],
          features: this.transformedFeatures(cell.features, 'rotated')
        }
      }.bind(this))
    };

    this.updateActiveBrush(rotatedBrush);
  }

  AdvancedEditor.prototype.onMouseDown = function(evt) {
    this.down = true;
    this.moved = false;
  }

  AdvancedEditor.prototype.onMouseUp = function(evt) {
    this.down = false;

    if (!this.moved) {
      this.click(evt);
    }
  }

  AdvancedEditor.prototype.onMouseMove = function(evt) {
    this.moved = true;

    if (!this.down) {
      return;
    }

    this.canvasPosition.add(new THREE.Vector2(evt.movementX, evt.movementY));
    $(this.canvas).css('left', this.canvasPosition.x);
    $(this.canvas).css('top', this.canvasPosition.y);
  }  

  AdvancedEditor.prototype.click = function(evt) {
    const offset = new THREE.Vector2(evt.offsetX - 465, evt.offsetY - 466);
    const cellCoords = offset.clone().divideScalar(this.cellSize).floor();
    offset.sub(cellCoords.clone().multiplyScalar(this.cellSize));

    const activeFeatures = (this.activeBrush.cells[cellCoords.toArray()] || { features: [] }).features;

    var features = [];

    if (offset.x < 5) {
      features.push('left-edge');
    }
    if (offset.x > 51) {
      features.push('right-edge');
    }
    if (offset.y < 5) {
      features.push('top-edge');
    }
    if (offset.y > 51) {
      features.push('bottom-edge');
    }
    if (Math.abs(offset.x - offset.y) < 5) {
      features.push('pos-diagonal');
    }
    if (Math.abs(offset.x + offset.y - 56) < 5) {
      features.push('neg-diagonal');
    }
    if (offset.y < offset.x && ~activeFeatures.indexOf('pos-diagonal') && features.length == 0) {
      features.push('top-right-triangle');
    }
    if (offset.x < offset.y && ~activeFeatures.indexOf('pos-diagonal') && features.length == 0) {
      features.push('bottom-left-triangle');
    }
    if (offset.x < (56 - offset.y) && ~activeFeatures.indexOf('neg-diagonal') && features.length == 0) {
      features.push('top-left-triangle');
    }
    if ((56 - offset.y) < offset.x && ~activeFeatures.indexOf('neg-diagonal') && features.length == 0) {
      features.push('bottom-right-triangle');
    }

    if (features.length != 1) {
      return;
    }

    const brush = {
      cells: _.cloneDeep(this.activeBrush.cells),
      rotated: this.activeBrush.rotated
    }

    const cell = brush.cells[cellCoords.toArray()] || { features: [] };
    
    if (cell.features.length == 1 && cell.features[0] == 'box') {
      cell.features = [];
    }

    cell.features = _.xor(cell.features, features);
    cell.coords = cellCoords.toArray();
    brush.cells[cellCoords.toArray()] = cell;
    
    this.updateActiveBrush(brush, true);
  }

  AdvancedEditor.prototype.updateActiveBrush = function(brush, center) {
    const hash = this.generateBrushHash(brush);

    if (!this.brushes[hash]) {
      this.addBrush(brush);
    }

    this.activateBrush(this.brushes[hash], center);
  }

  return AdvancedEditor;

})();
