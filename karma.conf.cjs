// eslint-disable-next-line unicorn/prevent-abbreviations
const webpackConfig = require('./webpack.config.cjs');

// Coverage mode
const isCoverage = process.argv.some(argument => /--coverage/.test(argument));

/** @type {import('karma').ConfigOptions} */
const karmaConfig = {
  files: [
    { pattern: './test/main.ts' },
    // TODO Crutch due to internal karma-webpack implementation
    { pattern: './dist/HostWorker.js', included: false, nocache: true },
    { pattern: './dist/RxHostWorker.js', included: false, nocache: true },
    { pattern: './dist/polyfill/es6-promise.auto.js', included: false }, // For IE11
  ],
  frameworks: ['jasmine', 'webpack'],
  preprocessors: {
    './test/main.ts': ['webpack'],
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
