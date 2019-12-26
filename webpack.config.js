const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const { readdirSync } = require('fs');
const { resolve } = require("path");

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
const moduleTypes = ["umd", "commonjs"];

function externalModules(moduleType) {
    /**
     * @param {string} context
     * @param {string} request
     * @param {(error: any, result: any) => void} callback
     */
    const external = function(context, request, callback) {
        if (/^@core/.test(request)) {
            return callback(null, `${moduleType} @worker-runner/core`);
        }
        if (/^rxjs/.test(request)) {
            return callback(null, `${moduleType} ${request}`);
        }
        callback();
    };
    return external;
}
function generateBuildConfig(moduleName, moduleType) {
    /** @type {import('webpack').Configuration} */
    const config = {
        mode: "production",
        context: resolve(`modules/${moduleName}`),
        entry: {[moduleName]: `./index.ts`},
        externals: externalModules(moduleType),
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: [/node_modules/],
                    use: "ts-loader",
                },
            ],
        },
        output: {
            filename: `${moduleName}${moduleType === "umd" ? ".umd" : ""}.js`,
            libraryTarget: moduleType,
            library: `@worker-runner/${moduleName}`,
            umdNamedDefine: true,
            path: resolve(`dist/${moduleName}/${moduleType}`),
        },

        resolve: {
            extensions: [".js", ".ts"],
            plugins: [new TsconfigPathsPlugin()],
        },
        devtool: "source-map",
    };
    return config;
}

module.exports = [].concat(
    ...moduleNames.map(moduleName => moduleTypes.map((moduleType) =>
        generateBuildConfig(moduleName, moduleType))),
);
