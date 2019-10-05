/** @type {import('webpack').Configuration} */
module.exports = {
    context: __dirname,
    entry: {
        'worker-runner': './src/index.ts',
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
        extensions: ['.js', '.ts']
    },
    devtool: 'source-map',
};
