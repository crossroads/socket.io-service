/* USAGE
 *   NODE_ENV=production grunt shipit:production deploy
 *   NODE_ENV=production grunt shipit:production rollback
 */

var pkg = require('./package.json');
var async = require('async');
var path = require('path');
var config = require('./config.js');

module.exports = function (grunt) {

  /**
   * Initialize config.
   */

  grunt.initConfig({
    shipit: {
      options: {
        // Project will be build in this directory.
        workspace: '/tmp/socket.io-webservice',

        // Project will be deployed in this directory.
        deployTo: '/opt/node/socket.io-webservice',

        // Repository url.
        repositoryUrl: pkg.repository,

        // This files will not be transfered.
        ignores: ['.git', 'node_modules'],

        // Number of release to keep (for rollback).
        keepReleases: 3,

        // Array of files to link in shared directory.
        linkedFiles: ['sites.yml', 'config.yml', 'newrelic.js'],

        // Array of files to link in shared directory.
        linkedDirs: ['node_modules', 'logs'],

      },

    // Production environment.
      staging: {
        // Servers defined manually here:
        // servers: ['deploy@example.net']
        // Or, servers defined in config.yml:
        servers: config.servers
      },
      production: {
        servers: config.servers
      }
    }
  });

  /**
   * Load shipit task.
   */
  grunt.loadNpmTasks('grunt-shipit');
  grunt.loadNpmTasks('shipit-deploy');

  grunt.registerTask('copyLinkedFiles', 'Copy files from the shared directory', function() {
    var done = this.async();
    var linkedFiles = grunt.shipit.config.linkedFiles;
    var deployTo = grunt.shipit.config.deployTo;
    var releasePath = path.join(grunt.shipit.releasesPath, grunt.shipit.releaseDirname);
    var sharedPath = path.join(deployTo, 'shared');
    async.eachSeries(linkedFiles, function(file, next) {
      grunt.shipit.remote('ln -nfs ' + path.join(sharedPath, file) + ' ' + releasePath, next);
    }, done);
  });

  grunt.registerTask('copyLinkedDirs', 'Symlink shared directories', function() {
    var done = this.async();
    var linkedDirs = grunt.shipit.config.linkedDirs;
    var deployTo = grunt.shipit.config.deployTo;
    var sharedPath = path.join(deployTo, 'shared');
    var releasePath = path.join(grunt.shipit.releasesPath, grunt.shipit.releaseDirname);
    async.eachSeries(linkedDirs, function(dir, next) {
      var src = path.join(sharedPath, dir);
      grunt.shipit.remote('mkdir -p ' + src + ' && ln -nfs ' + src + ' ' + releasePath, next);
    }, done);
  });

  grunt.registerTask('remote:install', function () {
    var deployTo = grunt.shipit.config.deployTo;
    var releasePath = path.join(grunt.shipit.releasesPath, grunt.shipit.releaseDirname);
    var currentPath =  path.join(deployTo, 'current');
    grunt.shipit.remote('cd '+ releasePath + ' && npm install --production', this.async());
  });

  grunt.registerTask('remote:restart', 'Restart Passenger', function() {
    var deployTo = grunt.shipit.config.deployTo;
    var currentPath =  path.join(deployTo, 'current');
    grunt.shipit.remote('mkdir -p ' + path.join(currentPath, '/tmp') + ' && touch ' + currentPath + '/tmp/restart.txt', this.async());
  });

  /**
   * Hooks
   */

  grunt.shipit.on('published', function () {
    grunt.task.run(['remote:restart']);
  });

  grunt.shipit.on('updated', function () {
    grunt.task.run(['copyLinkedFiles', 'copyLinkedDirs', 'remote:install']);
  });

};
