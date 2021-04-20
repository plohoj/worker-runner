// eslint-disable-next-line unicorn/prevent-abbreviations
const webpackConfig = require('./webpack.config');

// Coverage mode
const isCoverage = process.argv.some(argument => /--coverage/.test(argument));

/** @type {import('karma').ConfigOptions} */
const karmaConfig = {
  files: [
    { pattern: './test/main.ts', watched: false },
    { pattern: './test/worker.ts', watched: false, included: false },
    { pattern: './test/rx-worker.ts', watched: false, included: false },
  ],
  frameworks: ['jasmine'],
  preprocessors: {
    './test/main.ts': ['webpack'],
    './test/worker.ts': ['webpack'],
    './test/rx-worker.ts': ['webpack'],
  },
  webpack: webpackConfig,
  reporters: isCoverage ? ['coverage-istanbul']: ['progress'],
  coverageIstanbulReporter: {
    reports: ['html'],
  },
  webpackMiddleware: {
    stats: 'errors-only',
  },
};

module.exports = (config) => config.set(karmaConfig);
