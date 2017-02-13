'use strict';

const fs              = require('fs');
const path            = require('path');

const bind      = require('./misc/bind');
const config    = require('../../../config');

module.exports = (function() {

  function Simulation(voxelGrid) {
    bind(this);

    this.voxelGrid = voxelGrid;
    var url = 'ws://' + config.simulation.ip + ':' + config.simulation.port + '/simulation';
    this.connect(url);
  }

  Simulation.prototype.start = function() {
    this.running = true;

    const simulationData = this.voxelGrid.simulationData();

    if (simulationData.mesh) {
      this.setMesh(simulationData.mesh);
    }

    if (simulationData.anchors) {
      this.setAnchorPoints(simulationData.anchors);
    }
  }

  Simulation.prototype.stop = function() {
    this.running = false;
    this.voxelGrid.stopSimulation();
  }

  Simulation.prototype.setMesh = function(mesh) {
    console.log('Sending mesh data...');
    this.sendMessage({
      method: 'SetMesh',
      parameters: mesh
    });
  }

  Simulation.prototype.setAnchorPoints = function(anchors) {
    console.log('Sending anchor points...');
    this.sendMessage({
      method: 'SetAnchorPoints',
      parameters: {
        anchorPoints: anchors
      }
    });
  }

  Simulation.prototype.simulate = function(forceVector, loadVertex) {
    const force = forceVector.getComponent(forceVector.largestComponent());
    this.voxelGrid.interpolateSimulation(force);

    if (this.busy) {
      return;
    }

    this.busy = true;
    this.simulatedForce = force;
    console.log('Sending simulation parameters...');
    this.sendMessage({
      method: 'Simulate',
      parameters: {
        forceVector: forceVector.toArray(),
        loadVertex: loadVertex.toArray()
      }
    });
  }

  Simulation.prototype.connect = function(url) {
    this.url = url || this.url;
    this.websocket = new WebSocket(this.url);
    this.websocket.onopen = this.onConnect;
    this.websocket.onerror = this.onConnectFailed;
    this.websocket.onmessage = this.onReceivedMessage;
    this.websocket.onclose = this.onClose;
  }

  Simulation.prototype.sendMessage = function(message) {
    if (this.websocket.readyState == WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('Websocket not connectend. Message not sent.');
    }
  }

  Simulation.prototype.onConnect = function() {
    console.log('Websocket connection established to simulation.');
  }

  Simulation.prototype.onClose = function(connection) {
    console.warn('Websocket connection closed. Trying to reconnect...');
  }

  Simulation.prototype.onConnectFailed = function(error) {
    console.warn('Connecting websocket to simulation failed. Retrying...' + error);
    setTimeout(this.connect, 5000);
  }

  Simulation.prototype.onReceivedMessage = function(message) {
    console.log('Received simulation...');

    this.busy = false;

    if (!this.running) {
      return;
    }

    const vertices = JSON.parse(message.data).Parameters.Vertices;
    this.voxelGrid.updateSimulation(vertices, this.simulatedForce);
  }

  return Simulation;

})();
