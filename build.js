const { exec } = require('child_process');
const { readdirSync, rename, rmdir, copyFile } = require('fs');
const { resolve: resolveFile } = require("path");

const moduleNames = readdirSync(resolveFile('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

async function buildLibs() {
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
            rename(resolveFile(`dist/declarations/${moduleName}`), resolveFile(`dist/${moduleName}/declarations`),
                error => error ? reject(error) : resolve()),
        )),
    );
    await new Promise((resolve, reject) => rmdir(resolveFile('dist/declarations'),
        error => error ? reject(error) : resolve()));
}

async function copyModulesPackage() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolve, reject) =>
            copyFile(resolveFile(`modules/${moduleName}/package.json`), resolveFile(`dist/${moduleName}/package.json`),
                error => error ? reject(error) : resolve()),
        )),
    );
}

async function copyModulesReadme() {
    await Promise.all(moduleNames
        .map(moduleName => new Promise((resolve, reject) => {
            const readmeFilePath = moduleName == 'core' ? `modules/core/README.md` : `README.md`
            copyFile(resolveFile(readmeFilePath), resolveFile(`dist/${moduleName}/README.md`),
                error => error ? reject(error) : resolve());
        })),
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
    console.log('Copy modules "README.md" ...');
    await copyModulesReadme();
})().catch(error => {
    console.error(error);
    process.on('SIGINT', () => process.exit(1));
});
