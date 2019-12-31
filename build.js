const { exec } = require('child_process');
const { resolve } = require("path");
const { readdirSync, rename, rmdir, copyFile } = require('fs');

const moduleNames = readdirSync(resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

async function buildLibs() {
    await new Promise((resolver, reject) =>
        exec(`npx rollup --config`, (error) => error ? reject(error) : resolver()));
}

async function buildDeclarations() {
    await Promise.all(moduleNames
        .filter(moduleName => moduleName !== 'core')
        .map(moduleName => new Promise((resolver, reject) => 
            exec(`npx tsc -p ./modules/${moduleName} --outDir "./dist/declarations" -d true --emitDeclarationOnly true`,
                (error) => error ? reject(error) : resolver()),
        )),
    );
}

async function moveDeclarations() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolver, reject) =>
            rename(resolve(`dist/declarations/${moduleName}`), resolve(`dist/${moduleName}/declarations`),
                error => error ? reject(error) : resolver()),
        )),
    );
    await new Promise((resolver, reject) => rmdir(resolve('dist/declarations'),
        error => error ? reject(error) : resolver()));
}

async function copyModulesPackage() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolver, reject) =>
            copyFile(resolve(`modules/${moduleName}/package.json`), resolve(`dist/${moduleName}/package.json`),
                error => error ? reject(error) : resolver()),
        )),
    );
}

(async function main() {
    console.log('Build modules ...');
    await buildLibs();
    console.log('Build declarations ...');
    await buildDeclarations();
    console.log('Move declarations ...');
    await moveDeclarations();
    console.log('Copy modules "package.json" ...');
    await copyModulesPackage()
})();
