'use strict';

var Editor = require('./editor');
window.jQuery = window.$ = require('jquery');
require('bootstrap');

window.onload = function() {
  window.editor = new Editor();
  window.editor.run();
};
