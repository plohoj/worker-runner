const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

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
      core: [
        './modules/core/resolver/node-runner.resolver.ts',
        './modules/core/resolver/worker-runner.resolver.ts',
      ],
      promise: [
        './modules/promise/resolvers/runner.resolver.ts',
        './modules/promise/dev/runner.resolver.ts',
      ],
      rx: [
        './modules/rx/resolvers/runner.resolver.ts',
        './modules/rx/dev/runner.resolver.ts',
      ],
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
          use: 'ts-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [new TsconfigPathsPlugin()]
    },
  },
  webpackMiddleware: {
    stats: 'errors-only',
  },
});
