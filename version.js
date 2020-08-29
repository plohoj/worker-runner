const { exec } = require('child_process');
const { readdirSync, readFile, writeFile } = require('fs');
const { resolve: resolvePath } = require("path");
const semver = require('semver');
const mainPackage = require('./package.json');

const versionTypeArgument = process.argv.find(argument => /--type[ =].+/.test(argument));
let versionType = 'patch';
if (versionTypeArgument) {
    versionType = versionTypeArgument.replace(/--type[ =]/, '');
}

const newVersion = semver.inc(mainPackage.version, versionType);
const dependencyVersion = newVersion.replace(new RegExp(`\\.${semver.parse(newVersion).patch}$`), '.0');

const moduleNames = readdirSync(resolvePath('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

/**
 * @param {string} directory 
 * @param {'major' | 'minor' | 'patch'} type
 * @returns {Promise<string>}
 */
async function updateVersion(path) {
    return new Promise((resolve, reject) =>  readFile(path, 'utf8', (error, data) => {
        if (error) {
            reject(error);
            return;
        }
        const package = JSON.parse(data);
        package.version = newVersion;
        if ('dependencies' in package) {
            for (const dependency in package.dependencies) {
                if (dependency.includes('@worker-runner/')) {
                    package.dependencies[dependency] = '^' + dependencyVersion;
                }
            }
        }
        writeFile(path, JSON.stringify(package, undefined, '  ') + '\n', 'utf8' ,(error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        })
    }));
}

function successLog(directory) {
    console.log(`${directory}\t-->\t ${newVersion.replace('\n', '')}`);
}

function errorLog(directory) {
    console.warn(`${directory}\t--x\t [Not found]`);
}

(async function main() {
    await Promise.all([
        updateVersion(resolvePath(`./package.json`), versionType)
            .then(version => successLog(`/package.json`, version)),
        updateVersion(resolvePath(`./package-lock.json`), versionType)
            .then(version => successLog(`./package-lock.json`, version)),
        ... moduleNames.map(moduleName => 
            updateVersion(resolvePath(`modules/${moduleName}/package.json`))
                .then(() => successLog(`modules/${moduleName}/package.json`)),
        ),
        ... moduleNames.map(moduleName => 
            updateVersion(resolvePath(`dist/${moduleName}/package.json`))
                .then(() => successLog(`dist/${moduleName}/package.json`))
                .catch(() => errorLog(`dist/${moduleName}/package.json`))
        ),
    ]).then(() => new Promise((resolve, reject) => {
        exec(`git commit -m "v${newVersion}" -m "[prepare release]" -a`,
            (error, stdout) => error ? reject(error) : resolve(stdout))
    })).catch(error => {
        console.error(error);
        process.on('SIGINT', () => process.exit(1));
    });
})();
