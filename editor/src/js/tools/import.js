'use strict';

const fs              = require('fs');
const exec            = require('child_process').exec;
const path            = require('path');
const bind            = require('../misc/bind');

module.exports = (function() {

  function Import(importFile, voxelGrid) {
    bind(this);

    this.importFile = importFile;
    this.voxelGrid = voxelGrid;
  }

    Import.prototype.importModel = function() {
        this.voxelize(this.importFile[0], 1, this.callbackVoxelizeOneVoxel);
    }

    Import.prototype.voxelize = function(modelPath, numberVoxels, callback) {
        const cmd = this.getBinvoxCommand(modelPath, numberVoxels);
        exec(cmd, function(error, stdout, stderr) {
        if (error) {
            console.log(error);
            console.log(stderr);
        } else {
            callback(modelPath, stdout);
        }
        });
    }

  Import.prototype.callbackVoxelizeOneVoxel = function(modelPath, stdout){
    console.log(stdout);
    
    // const dimension = parseFloat(this.getSubstring(stdout, "longest length: ", "n"));
    // console.log("import: model longest length: " + dimension);

    // unfortunately, 'longest length' doesn't always contain the longest lenght. therefore we calculate it from the bounding box

    const point1String = this.getSubstring(stdout, "Mesh::normalize, bounding box: [", "]");
    const point2String = this.getSubstring(stdout, "] - [", "]");
    const point1 = this.getIntArrayFromString(point1String, ", ");
    const point2 = this.getIntArrayFromString(point2String, ", ");

    var diff = [];
    for(var i = 0; i < point1.length; i++)
      diff[i] = Math.abs(point1[i] - point2[i]);

    const dimension = Math.max.apply(Math, diff);
    console.log("import: model longest length: " + dimension);

    const cellSize = this.voxelGrid.cellSize - 0.1;
    const numberVoxels = Math.ceil(dimension/cellSize);

    const fileToDelete = this.getSubstring(stdout, "VoxelFile::write_file(", ")\r\nWrote");
    if(fs.existsSync(fileToDelete))
      fs.unlinkSync(fileToDelete);

    this.voxelize(modelPath, numberVoxels, this.callbackVoxelize);
  }

  Import.prototype.callbackVoxelize = function(modelPath, stdout){
    const voxelFile = this.getSubstring(stdout, "VoxelFile::write_file(", ")\r\nWrote");

    const voxelDimensionsString = this.getSubstring(stdout, "area filled: ", "integer bounding box: ")
    var voxelDimensions = this.getIntArrayFromString(voxelDimensionsString, " x ");

    if(fs.existsSync(voxelFile)) {
      const data = fs.readFileSync(voxelFile);
      this.voxelGrid.import(data, voxelDimensions);

      fs.unlinkSync(voxelFile);
    }
  }

  Import.prototype.getBinvoxCommand = function(modelPath, numberVoxels) {
      const binvoxPathRelative = "../../lib/binvox.exe"; 
      const binvoxPath = path.resolve(__dirname, binvoxPathRelative);

      return '"' + binvoxPath + '" -d '+ numberVoxels + ' -e "' + modelPath + '"';
  }

  Import.prototype.getSubstring = function(fullString, startString, endString) {
    const startStringLength = startString.length;

    const indexStart = fullString.indexOf(startString);
    const indexEnd = fullString.indexOf(endString, indexStart + startStringLength);
    const output = fullString.substring(indexStart + startStringLength, indexEnd);

    return output;
  }

    Import.prototype.getIntArrayFromString = function(arrayString, delimiter) {
        const arrayStringSplit = arrayString.split(delimiter);
        var array = [];

        for(var i = 0; i < arrayStringSplit.length; i++)
            array[i] = parseInt(arrayStringSplit[i]);

        return array;
    }

  return Import;
})();