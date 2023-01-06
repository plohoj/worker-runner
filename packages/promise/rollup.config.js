import copyPlugin from 'rollup-plugin-copy';
import { generateRollupBuildConfig } from '../../tools/rollup-config.js';

const baseRollupConfig = generateRollupBuildConfig('promise');

/** @type {import('rollup').RollupOptions} */
const config = {
    ...baseRollupConfig,
    plugins: [
        ...await baseRollupConfig.plugins,
        copyPlugin({
            targets: [{ src: '../../README.md', dest: './' }],
            verbose: true,
        })
    ]
};

export default config;
