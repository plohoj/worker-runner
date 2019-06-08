import { create as createBrowserSync } from 'browser-sync';
import { dest, parallel, series, src, task, watch } from 'gulp';
import * as rename from 'gulp-rename';
import * as sourceMaps from 'gulp-sourcemaps';
import { createProject } from 'gulp-typescript';

const browserSync = createBrowserSync();
const BUILD_PATH = './build';
const project = createProject('tsconfig.json', {
    outDir: './',
    sourceMap: true,
    module: 'AMD',
});

const PATH = {
    HTML: './src/**/*.html',
    TYPESCRIPT: ['./src/scripts/**/*.ts', '!**/*.d.ts'],
    JAVASCRIPT: './src/scripts/**/*.js',
}

task('copy_libraries', () => src('./node_modules/requirejs/require.js')
    .on('error', (e)=>{
        console.error('One of the described libraries was not found! Maybe you forgot to initialize npm (npm install)');
    })
    .pipe(rename((path) => {
        if (path.basename === 'r') {
            path.basename = 'require';
        }
    }))
    .pipe(dest(`${BUILD_PATH}/libs`)),
);

task('copy_typescript', () => src(PATH.TYPESCRIPT)
    .pipe(sourceMaps.init({debug: true}))
    .pipe(project())
    .pipe(sourceMaps.write({sourceRoot: '/'}))
    .pipe(dest(`${BUILD_PATH}/scripts`)),
);

task('copy_javascript', () => src(PATH.JAVASCRIPT)
    .pipe(dest(`${BUILD_PATH}/scripts`)),
);

task('copy_html', () => src(PATH.HTML)
    .pipe(dest(`${BUILD_PATH}/`)),
);

task('build', parallel('copy_libraries', 'copy_typescript', 'copy_javascript', 'copy_html'));

task('watch_html', ()=> watch(PATH.HTML)
    .on('change', (file) => src(file, {})
        .pipe(rename((path) => {
            if (path.dirname) {
                path.dirname = path.dirname.slice(3);
            }
        }))
        .pipe(dest(`${BUILD_PATH}/`))
        .pipe(browserSync.stream())
	),
);

task('watch_typescript', ()=> watch(PATH.TYPESCRIPT)
    .on('change', (file) => src(file)
        .pipe(sourceMaps.init())
        .pipe(project())
        .pipe(sourceMaps.write({sourceRoot: '/'}))
        .pipe(dest(`${BUILD_PATH}/scripts`))
        .pipe(browserSync.stream())
    ),
);

task('watch_javascript', ()=> watch(PATH.JAVASCRIPT)
    .on('change', (file) => src(file)
        .pipe(rename((path) => {
            if (path.dirname) {
                path.dirname = path.dirname.replace('\\', '/').replace('src/scripts', '');
            }
        }))
        .pipe(dest(`${BUILD_PATH}/scripts`))
        .pipe(browserSync.stream()),
	),
);

task('watch', parallel('watch_html', 'watch_typescript', 'watch_javascript'));

task('init_browser_sync', () => browserSync.init({
    server: {baseDir: BUILD_PATH, index: "index.html"},
    port: 8080,
    reloadDelay: 100,
}));

task('serve', series('build', parallel('watch', 'init_browser_sync')));

task('default', series('serve'));