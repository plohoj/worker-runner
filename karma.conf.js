const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { readdirSync } = require('fs');
const { resolve } = require("path");

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

  const isCoverageArg = process.argv.find(arg => /--coverage[ =].+/.test(arg));
  let isCoverage = false;
  if (isCoverageArg) {
      isCoverage = isCoverageArg.replace(/--type[ =]/, '').includes('true');
  }

const modulesEntry = {};
moduleNames.forEach(moduleName => modulesEntry[moduleName] = `./modules/${moduleName}/index.ts`);

/** @param {import('karma').Config} config*/
module.exports = (config) => config.set({
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
  webpack: {
    mode: 'development',
    devtool: 'eval-source-map',
    context: __dirname,
    entry: {
      ...modulesEntry,
      worker: './test/worker.ts',
      'rx-worker': './test/rx-worker.ts',
    },
    optimization: {
      splitChunks: {
        chunks: "all"
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            ...isCoverage ? ["coverage-istanbul-loader"]: [],
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                      useBuiltIns: 'usage',
                      corejs: 3,
                  }],
                ],
              },
            },
            'ts-loader',
          ]
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [new TsconfigPathsPlugin()]
    },
  },
  reporters: isCoverage ? ['coverage-istanbul']: ['progress']
  ,
  coverageIstanbulReporter: {
    reports: ['html'],
  },
  webpackMiddleware: {
    stats: 'errors-only',
  },
});
