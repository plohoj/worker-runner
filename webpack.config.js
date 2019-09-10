const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    context: __dirname,
    entry: {
        // 'worker-runner': './src/main/index.ts',
        // 'common': './src/test/common/index.ts',
        'worker-test': './src/test/worker/index.ts',
        test: './src/test/main/index.ts',
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
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.js', '.ts']
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Worker instance',
            excludeChunks: ['worker-test'],
        }),
    ],
    watch: true,
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 3400,
    },
};
