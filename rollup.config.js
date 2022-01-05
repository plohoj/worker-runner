import { readdirSync } from 'fs';
import path from "path";
import typescriptPlugin from 'rollup-plugin-typescript2';

const moduleNames = readdirSync(path.resolve('packages'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
const moduleFormats = ["umd", "esm"];

/** @type {import('rollup').GlobalsOption} */
const globalLibs = {
    'rxjs': 'rxjs',
    'tslib': 'tslib',

    'rxjs/operators': 'rxjs.operators',
    '@worker-runner/core': 'WorkerRunnerCore',
    '@worker-runner/promise': 'WorkerRunnerPromise',
    '@worker-runner/rx': 'WorkerRunnerRx',
};

function generateBuildConfig(moduleName, moduleFormat) {
    /** @type {import('rollup').RollupOptions} */
    const config = {
        input: `packages/${moduleName}/index.ts`,
        output: {
            name: `@worker-runner/${moduleName}`,
            globals: globalLibs,
            file: `dist/${moduleName}/${moduleFormat}/${moduleName}.js`,
            sourcemap: true,
            format: moduleFormat,
        },
        external: Object.keys(globalLibs),
        plugins: [
            typescriptPlugin(),
        ]
    };
    return config;
}

const configs = [];
for (const moduleName of moduleNames) {
    for (const moduleFormat of moduleFormats) {
        configs.push(generateBuildConfig(moduleName, moduleFormat));
    }
}
module.exports = configs;
