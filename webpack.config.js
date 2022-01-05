const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { BannerPlugin } = require('webpack');

const publicPath = '/base/dist';

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
                ]
            },
        ],
    },
    target: isDebugMode ? undefined : ['web', 'es5'], // For IE11
    plugins: [
        new ESLintPlugin({
            extensions: ["ts", "tsx"],
        }),
        ...isDebugMode
            ? []
            : [ // <------ For IE11
                new BannerPlugin({
                    raw: true,
                    banner: `if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.Promise === "undefined") {
                        importScripts("${publicPath}/polyfill/es6-promise.auto.js");
                    }`,
                }),
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: "./node_modules/es6-promise/dist/es6-promise.auto.js",
                            to: "./polyfill/es6-promise.auto.js"
                        },
                    ],
                }),
            ], // ------>
    ],
    output: {
        path: path.resolve('dist'),
        clean: true,
    },
    mode: 'development',
    resolve: {
        extensions: ['.js', '.ts'],
        plugins: [new TsconfigPathsPlugin()],
    },
    devtool: 'inline-source-map',
};
