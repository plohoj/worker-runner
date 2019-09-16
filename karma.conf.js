const webpackConfig = require('./webpack.config');

/** @param {import('karma').Config} config*/
module.exports = (config) => {
    config.set({
      files: [
        // all files ending in "_test"
        { pattern: 'test/main.ts', watched: false },
        { pattern: 'test/worker.ts', watched: false },
        // each file acts as entry point for the webpack configuration
      ],
      frameworks: ['jasmine'],
      preprocessors: {
        // add webpack as preprocessor
        'test/main.ts': ['webpack'],
        'test/worker.ts': ['webpack'],
      },
      webpack: {
        ...webpackConfig,
        mode: 'development',
        devtool: 'eval-source-map',
      },
      webpackMiddleware: {
        stats: 'errors-only',
      },
    });
  };