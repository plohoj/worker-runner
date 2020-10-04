// eslint-disable-next-line unicorn/prevent-abbreviations
const { readdirSync } = require('fs');
const { resolve } = require("path");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

// Debug mode
const isDebugMode = process.argv.some(argument => /--debug/.test(argument));
if (isDebugMode) {
  console.log('Running in debug mode. Typescript compiler option target is set to: ES2019.');
}

// Coverage mode
const coverageArgument = process.argv.find(argument => /--coverage[ =].+/.test(argument));
let isCoverage = false;
if (coverageArgument) {
    isCoverage = coverageArgument.replace(/--type[ =]/, '').includes('true');
}

// Modules entry files
const modulesEntry = {};
moduleNames.forEach(moduleName => modulesEntry[moduleName] = `./modules/${moduleName}/index.ts`);

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
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            ...isCoverage ? ["coverage-istanbul-loader"]: [],
            ...isDebugMode ? [] : [{
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                      useBuiltIns: 'usage',
                      corejs: 3,
                  }],
                ],
              },
            }],
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  ...isDebugMode ? { target: 'ES2019' } : undefined,
                }
              }
            },
            {
              loader: 'eslint-loader',
              options: {
                emitError: true,
                emitWarning: true,
              },
            }
          ]
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [new TsconfigPathsPlugin()]
    },
  },
  reporters: isCoverage ? ['coverage-istanbul']: ['progress'],
  coverageIstanbulReporter: {
    reports: ['html'],
  },
  webpackMiddleware: {
    stats: 'errors-only',
  },
};

module.exports = (config) => config.set(karmaConfig);
