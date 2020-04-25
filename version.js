const { exec } = require('child_process');
const { readdirSync, readFile, writeFile } = require('fs');
const { resolve } = require("path");
const mainPackage = require('./package.json');
const semver = require('semver');

const versionTypeArg = process.argv.find(arg => /--type[ =].+/.test(arg));
let versionType = 'patch';
if (versionTypeArg) {
    versionType = versionTypeArg.replace(/--type[ =]/, '');
}

const newVersion = semver.inc(mainPackage.version, versionType);
const dependencyVersion = newVersion.replace(new RegExp(`\.${semver.parse(newVersion).patch}$`), '.0');

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

/**
 * @param {string} directory 
 * @param {'major' | 'minor' | 'patch'} type
 * @returns {Promise<string>}
 */
async function updateVersion(path) {
    return new Promise((resolver, reject) =>  readFile(path, 'utf8', (error, data) => {
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
        writeFile(path, JSON.stringify(package, null, '  ') + '\n', 'utf8' ,(error) => {
            if (error) {
                reject(error);
                return;
            }
            resolver();
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
        updateVersion(resolve(`./package.json`), versionType)
            .then(version => successLog(`/package.json`, version)),
        updateVersion(resolve(`./package-lock.json`), versionType)
            .then(version => successLog(`./package-lock.json`, version)),
        ... moduleNames.map(moduleName => 
            updateVersion(resolve(`modules/${moduleName}/package.json`))
                .then(() => successLog(`modules/${moduleName}/package.json`)),
        ),
        ... moduleNames.map(moduleName => 
            updateVersion(resolve(`dist/${moduleName}/package.json`))
                .then(() => successLog(`dist/${moduleName}/package.json`))
                .catch(() => errorLog(`dist/${moduleName}/package.json`))
        ),
    ]).then(() => new Promise((resolver, reject) => {
        exec(`git commit -m "v${newVersion}" -m "[prepare release]" -a`,
            (error, stdout) => error ? reject(error) : resolver(stdout))
    })).catch(error => {
        console.error(error);
        process.exit(1);
    });
})();
