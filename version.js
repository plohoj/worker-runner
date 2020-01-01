const { exec } = require('child_process');
const { resolve } = require("path");
const { readdirSync } = require('fs');

const versionTypeArg = process.argv.find(arg => /--type[ =].+/.test(arg));
let versionType = 'patch';
if (versionTypeArg) {
    versionType = versionTypeArg.replace(/--type[ =]/, '');
}

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

/**
 * @param {string} directory 
 * @param {'major' | 'minor' | 'patch'} type
 * @returns {Promise<string>}
 */
async function updateVersion(directory, type) {
    return new Promise((resolver, reject) => 
        exec(`npm version ${type} --no-git-tag-version`, {cwd: directory},
                    (error, stdout) => error ? reject(error) : resolver(stdout)),
    )
}

function successLog(directory, version) {
    console.log(`${directory}\t-->\t ${version.replace('\n', '')}`);
}

function errorLog(directory) {
    console.warn(`${directory}\t--x\t [Not found]`);
}

(async function main() {
    await Promise.all([
        ...moduleNames.map(moduleName => 
            updateVersion(resolve(`modules/${moduleName}`), versionType)
                .then(version => successLog(`modules/${moduleName}`, version)),
        ),
        ...moduleNames.map(moduleName => 
            updateVersion(resolve(`dist/${moduleName}`), versionType)
                .then(version => successLog(`dist/${moduleName}`, version))
                .catch(() => errorLog(`dist/${moduleName}`))
        ),
        updateVersion(undefined, versionType)
            .then(version => successLog(`[main]`, version))
    ]);
})();
