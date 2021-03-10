const { exec } = require('child_process');
const { readdirSync, rename, rmdir, copyFile } = require('fs');
const path = require("path");

const moduleNames = readdirSync(path.resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

async function buildModules() {
    await new Promise((resolve, reject) =>
        exec(`npx rollup --config`, (error) => error ? reject(error) : resolve()));
}

async function buildDeclarations() {
    await Promise.all(moduleNames
        .filter(moduleName => moduleName !== 'core')
        .map(moduleName => new Promise((resolve, reject) => 
            exec(`npx tsc -p ./modules/${moduleName} --outDir "./dist/declarations" -d true --emitDeclarationOnly true`,
                (error) => error ? reject(error) : resolve()),
        )),
    );
}

async function moveDeclarations() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolve, reject) =>
            rename(path.resolve(`dist/declarations/${moduleName}`), path.resolve(`dist/${moduleName}/declarations`),
                error => error ? reject(error) : resolve()),
        )),
    );
    await new Promise((resolve, reject) => rmdir(path.resolve('dist/declarations'),
        error => error ? reject(error) : resolve()));
}

async function copyModulesPackage() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolve, reject) =>
            copyFile(path.resolve(`modules/${moduleName}/package.json`), path.resolve(`dist/${moduleName}/package.json`),
                error => error ? reject(error) : resolve()),
        )),
    );
}

async function copyModulesReadme() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolve, reject) => {
            const readmeFilePath = moduleName == 'core' ? `modules/core/README.md` : `README.md`
            copyFile(path.resolve(readmeFilePath), path.resolve(`dist/${moduleName}/README.md`),
                error => error ? reject(error) : resolve());
        })),
    );
}

(async function main() {
    try {
        console.log('Build modules ...');
        await buildModules();
        console.log('Build declarations ...');
        await buildDeclarations();
        console.log('Move declarations ...');
        await moveDeclarations();
        console.log('Copy modules "package.json" ...');
        await copyModulesPackage()
        console.log('Copy modules "README.md" ...');
        await copyModulesReadme();
    } catch (error) {
        console.error(error);
        process.on('SIGINT', () => process.exit(1));
    }
})();
