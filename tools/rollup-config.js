import typescriptPlugin from 'rollup-plugin-typescript2';

/** @type {import('rollup').GlobalsOption} */
const globalLibs = {
    'rxjs': 'rxjs',
    'tslib': 'tslib',

    'rxjs/operators': 'rxjs.operators',
    '@worker-runner/core': 'WorkerRunnerCore',
    '@worker-runner/promise': 'WorkerRunnerPromise',
    '@worker-runner/rx': 'WorkerRunnerRx',
};

const moduleFormats = ["umd", "esm"];

/**
 * @param {string} packageName 
 */
export function generateRollupBuildConfig(packageName) {
    /** @type {import('rollup').OutputOptions} */
    const baseOutput = {
        name: `@worker-runner/${packageName}`,
        globals: globalLibs,
        sourcemap: true,
    }

    /** @type {import('rollup').RollupOptions} */
    const config = {
        input: `./index.ts`,
        output: moduleFormats.map(moduleFormat => ({
            ...baseOutput,
            file: `./dist/${moduleFormat}/worker-runner-${packageName}.js`,
            format: moduleFormat,
        })),
        external: Object.keys(globalLibs),
        plugins: [
            typescriptPlugin(),
        ],
    };
    return config;
}
