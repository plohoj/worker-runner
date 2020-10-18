import { readdirSync } from 'fs';
import path from "path";
import typescript from 'rollup-plugin-typescript2';

const moduleNames = readdirSync(path.resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
const moduleFormats = ["umd", "esm"];

function generateBuildConfig(moduleName, moduleFormat) {
    /** @type {import('rollup').RollupOptions} */
    const config = {
        input: `modules/${moduleName}/index.ts`,
        output: {
            name: `@worker-runner/${moduleName}`,
            globals: {
                rxjs: 'rxjs',
                'rxjs/operators': 'rxjs.operators',
                '@worker-runner/core': 'WorkerRunnerCore',
                '@worker-runner/promise': 'WorkerRunnerPromise',
                '@worker-runner/rx': 'WorkerRunnerRx',
            },
            file: `dist/${moduleName}/${moduleFormat}/${moduleName}.js`,
            sourcemap: true,
            format: moduleFormat,
        },
        external: ['rxjs', 'rxjs/operators', '@worker-runner/core'],
        plugins: [
            typescript(),
        ]
    };
    return config;
}

module.exports = [].concat(
    ...moduleNames.map(moduleName => moduleFormats.map((moduleFormat) =>
        generateBuildConfig(moduleName, moduleFormat))),
);
