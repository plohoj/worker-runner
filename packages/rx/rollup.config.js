import copyPlugin from 'rollup-plugin-copy';
import { generateRollupBuildConfig } from '../../tools/rollup-config';

const baseRollupConfig = generateRollupBuildConfig('rx');

/** @type {import('rollup').RollupOptions} */
const config = {
    ...baseRollupConfig,
    plugins: [
        ...baseRollupConfig.plugins,
        copyPlugin({
            targets: [{ src: '../../README.md', dest: './' }],
            verbose: true,
        })
    ]
};

export default config;
