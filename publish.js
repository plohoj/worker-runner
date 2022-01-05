const { exec } = require('child_process');
const { readdirSync } = require('fs');
const path = require("path");

const moduleNames = readdirSync(path.resolve('dist'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

async function publish(moduleName) {
    await new Promise((resolve, reject) =>
        exec(`npm publish`,
            {cwd: path.resolve(`dist/${moduleName}`)},
            (error) => error ? reject(error) : resolve()
        ));
}

(async function main() {
    console.log('Publication on npm repositories ...');
    try {
        await Promise.all(
            moduleNames.map(moduleName => publish(moduleName)
                .then(() => console.log(`${moduleName}\t-->\tDone`)))
        );
    } catch(error) {
        console.error(error);
        process.on('SIGINT', () => process.exit(1));
    }
})();
