const webpackConfig = require('./webpack.config');

/** @param {import('karma').Config} config*/
module.exports = (config) => {
    config.set({
      files: [
        { pattern: './test/main.ts', watched: false },
        { pattern: './test/worker.ts', watched: false },
      ],
      frameworks: ['jasmine'],
      preprocessors: {
        './test/main.ts': ['webpack'],
        './test/worker.ts': ['webpack'],
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