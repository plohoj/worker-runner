const { exec } = require('child_process');
const { readdirSync } = require('fs');
const { resolve: resolvePath } = require("path");

const moduleNames = readdirSync(resolvePath('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

async function publish(moduleName) {
    await new Promise((resolve, reject) =>
        exec(`npm publish`,
            {cwd: resolvePath(`dist/${moduleName}`)},
            (error) => error ? reject(error) : resolve()
        ));
}

(async function main() {
    console.log('Publication on npm repositories ...');
    await Promise.all(moduleNames.map(moduleName => publish(moduleName)
        .then(() => console.log(`${moduleName}\t-->\tDone`))))
        .catch(error => {
            console.error(error);
            process.on('SIGINT', () => process.exit(1));
        });
})();
