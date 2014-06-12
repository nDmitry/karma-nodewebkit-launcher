var fs = require('fs');
var path = require('path');
var join = path.join;
var ncp = require('ncp').ncp;
var async = require('async');
var merge = require('merge');

var NodeWebkitBrowser = function(baseBrowserDecorator, args) {
  baseBrowserDecorator(this);

  var customOptions = args.options || {};

  this._start = function(url) {
    var self = this;
    var MODULE_PATH = join(__dirname, '..')
    var SOURCE_PATH = join(__dirname, 'runner.nw');
    var STATIC_PATH = join(self._tempDir, 'runner.nw');
    var INDEX_HTML = join(STATIC_PATH, 'index.html');
    var PACKAGE_JSON = join(STATIC_PATH, 'package.json');

    async.auto({
      'directory': function(callback) {
        ncp(SOURCE_PATH, STATIC_PATH, callback);
      },
      'node_modules': ['directory', function(callback) {
        fs.symlink(MODULE_PATH, join(STATIC_PATH, 'node_modules'), 'dir', callback);
      }],
      'index.html:read': ['directory', function(callback) {
        fs.readFile(INDEX_HTML, callback);
      }],
      'index.html:write': ['index.html:read', function(callback, results) {
        var content = results['index.html:read'].toString().replace('%URL%', url);
        fs.writeFile(INDEX_HTML, content, callback);
      }],
      'package.json:read': ['directory', function(callback) {
        fs.readFile(PACKAGE_JSON, callback);
      }],
      'package.json:write': ['package.json:read', function(callback, results) {
        var options = JSON.parse(results['package.json:read'].toString());
        options = merge(true, options, customOptions);
        fs.writeFile(PACKAGE_JSON, JSON.stringify(options), callback);
      }],
      'exec': ['index.html:write', 'package.json:write', function(callback) {
        self._execCommand(self._getCommand(), [STATIC_PATH]);
      }]
    });
  };
};

NodeWebkitBrowser.prototype = {
  name: 'node-webkit',

  DEFAULT_CMD: {
    linux: path.normalize(__dirname + '/../.bin/nodewebkit'),
    darwin: path.normalize(__dirname + '/../nodewebkit/nodewebkit/node-webkit.app/Contents/MacOS/node-webkit'),
    win32: path.normalize(__dirname + '/../nodewebkit/nodewebkit/nw.exe')
  },

  ENV_CMD: 'NODEWEBKIT_BIN'
};

NodeWebkitBrowser.$inject = ['baseBrowserDecorator', 'args'];

// PUBLISH DI MODULE
module.exports = {
  'launcher:NodeWebkit': ['type', NodeWebkitBrowser]
};
