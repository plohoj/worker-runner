const { exec } = require('child_process');
const { resolve } = require("path");
const { readdirSync } = require('fs');

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

async function publish(moduleName) {
    await new Promise((resolver, reject) =>
        exec(`npm publish`,
            {cwd: resolve(`dist/${moduleName}`)},
            (error) => error ? reject(error) : resolver()
        ));
}

(async function main() {
    console.log('Publication on npm repositories ...');
    await Promise.all(moduleNames.map(moduleName => publish(moduleName)
        .then(() => console.log(`${moduleName}\t-->\tDone`))))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
})();
