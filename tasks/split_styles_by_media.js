/*
 * grunt-split-styles-by-media
 *
 * Copyright (c) 2017 Krivega Dmitriy
 * Licensed under the MIT license.
 */

const postcss = require('postcss');

module.exports = function(grunt) {
  grunt.registerMultiTask('split_styles_by_media', 'Split a CSS file based on media.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    const { remove, output, publicPath, ignoredMedia = [], assetsPretty } = this.options({
      remove: true, // Should we strip the matched rules from the src style sheet?
      output: false, // output file 'false' by default,
      publicPath: false, // public path for assets.json,
      assetsPretty: false
    });

    const mediaCSS = {};
    const assets = {};

    function hasSplitRule(rule) {
      return rule.name === 'media' &&
        !mediaCSS[rule.params] &&
        ignoredMedia.indexOf(rule.params) === -1;
    }

    // Our postCSS processor
    const processor = postcss(function(css) {
      css.walkAtRules(function(rule) {
        if (hasSplitRule(rule)) {
          const newCSS = postcss.root();

          rule.walkRules(function(rule) {
            newCSS.append(rule);
          });

          mediaCSS[rule.params] = newCSS;

          if (remove) {
            rule.remove();
          }
        }
      });
    });

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      const src = f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        // Read file source.
        const css = grunt.file.read(filepath);
        const processOptions = {};

        processOptions.from = filepath;
        processOptions.to = f.dest;

        // Run the postprocessor
        const output = processor.process(css, processOptions);

        if (output && output.map && output.map.length > 0) {
          grunt.log.writeln(`Sourcemap "${output}" created.`);
          grunt.file.write(`${f.dest}.map`, output.map);
        }

        return output.css;
      });

      // Write the newly split file.
      if (output) {
        let i = 0;
        const assetsSpace = assetsPretty ? 2 : 0;

        for (const mediaCSSItem in mediaCSS) {
          const fileName = `${i}.css`;
          let assetsFileName = fileName;
          grunt.file.write(`${output}${fileName}`, mediaCSS[mediaCSSItem]);

          if (publicPath) {
            assetsFileName = publicPath + assetsFileName;
          }

          assets[assetsFileName] = mediaCSSItem;
          grunt.log.writeln(`File "${fileName}" in "${output}" created.`);

          i++;
        }

        grunt.file.write(`${output}assets.json`, JSON.stringify(assets, undefined, assetsSpace));
      }

      // Write the destination file
      grunt.file.write(f.dest, src);
    });
  });
};
