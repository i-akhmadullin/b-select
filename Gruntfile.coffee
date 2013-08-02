module.exports = (grunt) ->
  'use strict'

  @loadNpmTasks('grunt-contrib-stylus');

  @initConfig
    stylus:
      test:
        files:
          'b-select.css': ['b-select.styl']

  @registerTask( 'default', [ 'stylus:test' ])
