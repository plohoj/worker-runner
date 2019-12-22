const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    context: __dirname,
    entry: {
        core: [
            './modules/core/resolver/node-runner.resolver.ts',
            './modules/core/resolver/worker-runner.resolver.ts',
        ],
        promise: './modules/core/runner-promises.ts',
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
    output: {filename: '[name].js'},
    resolve: {
        extensions: ['.js', '.ts'],
        plugins: [new TsconfigPathsPlugin()]
    },
    devtool: 'source-map',
};
