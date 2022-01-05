const { exec } = require('child_process');
const path = require("path");
const { copy, rm, readdirSync, stat } = require('fs-extra');

const packagesNames = readdirSync(path.resolve('packages'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

async function removeDistFolder() {
    await rm(path.resolve('dist'), {recursive: true, force: true});
}

async function buildPackages() {
    await new Promise((resolve, reject) =>
        exec(
            `npx rollup --config`,
            (error) => error ? reject(error) : resolve()
        )
    );
}

async function copyDeclarations() {
    await Promise
        .all(packagesNames
            .map(moduleName => copy(
                path.resolve(`packages/${moduleName}`),
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

async function copyPackagesPackageJSON() {
    await Promise
        .all(packagesNames
            .map(moduleName => copy(
                path.resolve(`packages/${moduleName}/package.json`),
                path.resolve(`dist/${moduleName}/package.json`),
            )),
        );
}

async function copyPackagesReadme() {
    await Promise
        .all(packagesNames
            .map(async moduleName => {
                const readmeFilePath = moduleName == 'core' ? `packages/core/README.md` : `README.md`;
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
        console.log('Build packages ...');
        await buildPackages();
        console.log('Copy declarations ...');
        await copyDeclarations();
        console.log('Copy packages "package.json" ...');
        await copyPackagesPackageJSON()
        console.log('Copy packages "README.md" ...');
        await copyPackagesReadme();
    } catch (error) {
        console.error(error);
        process.on('SIGINT', () => process.exit(1));
    }
})();
