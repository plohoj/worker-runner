const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Debug mode
const isDebugMode = process.argv.some(argument => /--debug/.test(argument));
if (isDebugMode) {
    console.log('Running in debug mode. Typescript compiler option target is set to: ES2019.');
}

// Coverage mode
const isCoverage = process.argv.some(argument => /--coverage/.test(argument));

/** @type {import('webpack').RuleSetRule['use']} */
const babelLoader = {
    loader: 'babel-loader',
    options: {
        presets: [
            ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3,
            }],
        ],
    },
};

/** @type {import('webpack').Configuration} */
module.exports = {
    entry: {
        host: './test/host/host.ts',
        'rx-host': './test/host/rx-host.ts',
    },
    context: path.resolve(),
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    ...isCoverage ? ["coverage-istanbul-loader"] : [],
                    ...isDebugMode ? [] : [babelLoader],
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                ...isDebugMode ? { target: 'ES2019' } : {},
                            }
                        }
                    },
                    ...(!isDebugMode || isCoverage) ? [] : [{
                        loader: 'eslint-loader',
                        options: {
                            emitError: true,
                            emitWarning: true,
                        }
                    }],
                ]
            },
        ],
    },
    mode: 'development',
    resolve: {
        extensions: ['.js', '.ts'],
        plugins: [new TsconfigPathsPlugin()],
    },
    devtool: 'inline-source-map',
};
