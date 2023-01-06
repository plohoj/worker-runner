/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable import/no-named-as-default-member */
/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { exec } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from "node:path";
import semver from 'semver';

const versionTypeArgument = process.argv.find(argument => /--type[ =].+/.test(argument));
let versionType = 'patch';
if (versionTypeArgument) {
    versionType = versionTypeArgument.replace(/--type[ =]/, '');
}

const mainPackageData = await getDataFromJsonFile('./package.json');

const newVersion = semver.inc(mainPackageData.version, versionType);
const dependencyVersion = newVersion.replace(new RegExp(`\\.${semver.patch(newVersion)}$`), '.0');

const moduleNamesDirent = await readdir(path.resolve('packages'), {withFileTypes: true})
const moduleNames = moduleNamesDirent.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

/**
 * @param {string} path 
 * @param {boolean} isExcludeUpdateDependencies
 * @returns {Promise<string>}
 */
async function updateVersion(path, isExcludeUpdateDependencies) {
    const packageData = await getDataFromJsonFile(path);
    packageData.version = newVersion;
    if (!isExcludeUpdateDependencies && 'dependencies' in packageData) {
        for (const dependency in packageData.dependencies) {
            if (dependency.includes('@worker-runner/')) {
                packageData.dependencies[dependency] = `^${dependencyVersion}`;
            }
        }
    }
    const modifiedPackageDataString = JSON.stringify(packageData, undefined, '  ') + '\n'
    await writeFile(path, modifiedPackageDataString, 'utf8');
    console.log(`${path}\t→\t ${newVersion}`);
}

/**
 * @param {string} path 
 * @returns {Promise<import('../package.json')>}
 */
async function getDataFromJsonFile(path) {
    const stringData =  await readFile(path, 'utf8');
    return JSON.parse(stringData);
}

await Promise.all([
    // eslint-disable-next-line unicorn/prefer-top-level-await
    updateVersion(`./package.json`, versionType),
    // eslint-disable-next-line unicorn/prefer-top-level-await
    updateVersion(`./package-lock.json`, versionType, true),
    ... moduleNames.map(moduleName => 
        updateVersion(`./packages/${moduleName}/package.json`),
    ),
]);
await new Promise((resolve, reject) => {
    exec(`git commit -m "v${newVersion}" -a`,
        (error, stdout) => error ? reject(error) : resolve(stdout))
});
