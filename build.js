const { exec } = require('child_process');
const path = require("path");
const { copy, rm, readdirSync, stat } = require('fs-extra');

const moduleNames = readdirSync(path.resolve('modules'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

async function removeDistFolder() {
    await rm(path.resolve('dist'), {recursive: true, force: true});
}

async function buildModules() {
    await new Promise((resolve, reject) =>
        exec(
            `npx rollup --config`,
            (error) => error ? reject(error) : resolve()
        )
    );
}

async function copyDeclarations() {
    await Promise
        .all(moduleNames
            .map(moduleName => copy(
                path.resolve(`modules/${moduleName}`),
                path.resolve(`dist/${moduleName}/declarations`),
                {
                    async filter(source) {
                        if ((await stat(source)).isDirectory()) {
                            return true;
                        }
                        return /.*\.ts$/.test(source)
                    }
                }
            )),
        );
}

async function copyModulesPackage() {
    await Promise
        .all(moduleNames
            .map(moduleName => copy(
                path.resolve(`modules/${moduleName}/package.json`),
                path.resolve(`dist/${moduleName}/package.json`),
            )),
        );
}

async function copyModulesReadme() {
    await Promise
        .all(moduleNames
            .map(async moduleName => {
                const readmeFilePath = moduleName == 'core' ? `modules/core/README.md` : `README.md`;
                await copy(
                    path.resolve(readmeFilePath),
                    path.resolve(`dist/${moduleName}/README.md`)
                );
            }),
        );
}

(async function main() {
    try {
        console.log('Remove "./dist" folder ...');
        await removeDistFolder();
        console.log('Build modules ...');
        await buildModules();
        console.log('Copy declarations ...');
        await copyDeclarations();
        console.log('Copy modules "package.json" ...');
        await copyModulesPackage()
        console.log('Copy modules "README.md" ...');
        await copyModulesReadme();
    } catch (error) {
        console.error(error);
        process.on('SIGINT', () => process.exit(1));
    }
})();
