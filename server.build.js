// NOTE: for whatever reason, a build.js file in the project dir will cause remix to crash.

const esbuild = require('esbuild');
(async () => {
    console.time('Build time');

    await esbuild.build({
        target: 'esnext',
        outdir: 'dist',
        // add installed packages here
        external: [
            'morgan',
            'express',
            'bluebird',
            'esbuild',
            'compression',
            'jsonwebtoken',
            'fluent-ffmpeg',
            'cookie-parser',
            '@prisma/client',
            '@remix-run/node',
            '@remix-run/express',
        ],
        bundle: true,
        platform: 'node',
        tsconfig: 'tsconfig.server.json',
        entryPoints: ['./src/server/index.ts'],
    });

    console.timeEnd('Build time');
})();